/**
 * Skill source manager: install, inspect, update, and scan the upstream skill
 * repositories the workbench hosts, and expose the resulting catalog to both
 * the HTTP surface and the `ctx.skills` provider.
 *
 * @module dsh-research-workbench/skill-manager
 */

import { readdir, readFile, rm } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { parse as parseYaml } from 'yaml';

import { guideFor, loadSkillGuides } from './skill-guides.js';

import {
  BUILTIN_PRESET_SOURCES,
  SKILL_NAME,
  SKIPPED_DIRECTORIES,
  SkillError,
  acquireInstallLock,
  downloadRepositoryArchive,
  fetchBranchHead,
  fieldSpecificReason,
  isDirectory,
  isSameRepository,
  normalizeState,
  parseGitHubUrl,
  pathExists,
  placeDirectory,
  readJsonFile,
  repositoryOf,
  resolveDefaultBranch,
  runGit,
  sourceIdFrom,
  writeJsonAtomic,
} from './skill-sources.js';

/** Deepest directory level, below one source root, that still counts as a skill location. */
const MAX_SCAN_DEPTH = 3;
/** How long a scan result is reused before the filesystem is read again. */
const SCAN_TTL_MS = 2_000;
/** Files that describe one skill. */
const SKILL_FILE = 'SKILL.md';

/** Category keys in display order. */
export const CATEGORIES = Object.freeze(['reading', 'writing', 'review', 'figure', 'general']);

const CATEGORY_RULES = Object.freeze([
  ['figure', /fig|plot|chart|draw|绘图|图表/i],
  ['review', /review|rebuttal|referee|citation|审稿|审阅|核验/i],
  ['writing', /writ|polish|trans|draft|abstract|patent|写作|润色|翻译/i],
  ['reading', /read|paper|literature|mineru|book|阅读|精读|文献/i],
]);

/** Classify one skill into a workbench category from its name and summary. */
export function categorizeSkill(name, description) {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(name)) return category;
  }
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  return 'general';
}

/**
 * The preset id one repository is known by, regardless of the id the actual
 * registration had to use. Guides and default recommendations follow the
 * repository, so an id collision never orphans them.
 * @param repository - stored `owner/repo`, or a GitHub URL.
 * @returns the canonical id, or `''` when the repository is not a preset.
 */
export function canonicalSourceId(repository) {
  if (repositoryOf(repository) === '') return '';
  const preset = BUILTIN_PRESET_SOURCES.find(item => isSameRepository(item.url, repository));
  return preset?.id ?? '';
}

/** Upper bound on one stored skill customization. */
export const MAX_OVERRIDE_BYTES = 256 * 1024;
/** Schema version of one `skill-overrides/<hash>.json` file. */
export const OVERRIDE_VERSION = 1;

/** sha256 of one file's exact bytes, in the shape the guide table stores. */
export function contentHash(raw) {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Frontmatter keys a shared customization may carry. */
function validFrontmatterKeys(data) {
  for (const key of Object.keys(data)) {
    if (key === '' || key === '__proto__' || key === 'constructor' || key === 'prototype') return false;
  }
  return true;
}

/**
 * Validate one edited `SKILL.md` document: its own name, a real summary, and
 * frontmatter the model catalog can still read.
 * @param content - complete document text.
 * @param name - the skill being edited.
 * @returns the parsed frontmatter.
 * @throws {SkillError} with code `invalid` when the document cannot be used.
 */
export function validateSkillDocument(content, name) {
  const text = typeof content === 'string' ? content : '';
  if (Buffer.byteLength(text, 'utf8') > MAX_OVERRIDE_BYTES) {
    throw new SkillError(`共享版本最多 ${Math.round(MAX_OVERRIDE_BYTES / 1024)} KiB`, 'limit_exceeded');
  }
  const parsed = parseFrontmatter(text);
  if (parsed === undefined) throw new SkillError('内容需要以 --- 开头的有效 frontmatter', 'invalid');
  if (!validFrontmatterKeys(parsed.data)) throw new SkillError('frontmatter 含不可用的键', 'invalid');
  if (parsed.data.name !== name) throw new SkillError(`frontmatter 的 name 必须是 ${name}`, 'invalid');
  if (typeof parsed.data.description !== 'string' || parsed.data.description.trim() === '') {
    throw new SkillError('frontmatter 需要有非空的 description', 'invalid');
  }
  if (parsed.data.whenToUse !== undefined && typeof parsed.data.whenToUse !== 'string') {
    throw new SkillError('frontmatter 的 whenToUse 必须是文本', 'invalid');
  }
  return parsed;
}

/**
 * Split YAML frontmatter from a `SKILL.md` body.
 * @param raw - complete file text.
 * @returns frontmatter data and body, or `undefined` when the file has none.
 */
export function parseFrontmatter(raw) {
  const firstBreak = raw.indexOf('\n');
  if (firstBreak < 0) return undefined;
  if (raw.slice(0, firstBreak).replace(/\r$/, '') !== '---') return undefined;
  let cursor = firstBreak + 1;
  while (cursor <= raw.length) {
    const next = raw.indexOf('\n', cursor);
    const line = (next < 0 ? raw.slice(cursor) : raw.slice(cursor, next)).replace(/\r$/, '');
    if (line === '---') {
      const bodyStart = next < 0 ? raw.length : next + 1;
      let data;
      try {
        data = parseYaml(raw.slice(firstBreak + 1, cursor));
      } catch {
        return undefined;
      }
      if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
      return { data, body: raw.slice(bodyStart) };
    }
    if (next < 0) break;
    cursor = next + 1;
  }
  return undefined;
}

/**
 * Sibling directories one skill refers to through `../<name>/` paths.
 * @param raw - the skill's complete text.
 * @returns distinct sibling names in first-seen order.
 */
export function referencedSiblings(raw) {
  const names = [];
  for (const match of raw.matchAll(/\.\.\/([A-Za-z0-9._-]+)(?:\/|$)/g)) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * One source's skills, complete with the shared-sibling existence check that
 * decides whether the skill can actually resolve its own references.
 */
export class SkillSourceManager {
  dataRoot;
  sourcesDir;
  stateFile;
  lockFile;
  log;
  git;
  state;
  scanCache;
  previews = new Map();
  listeners = new Set();

  /**
   * @param options - data root, logger, and an injectable git runner for tests.
   */
  constructor({ dataRoot, log, git = runGit } = {}) {
    if (typeof dataRoot !== 'string' || dataRoot === '') throw new TypeError('skill-manager: dataRoot is required');
    this.dataRoot = resolve(dataRoot);
    this.sourcesDir = join(this.dataRoot, 'sources');
    this.overridesDir = join(this.dataRoot, 'skill-overrides');
    this.stateFile = join(this.dataRoot, 'state.json');
    this.lockFile = join(this.dataRoot, 'install.lock');
    this.log = log ?? { warn() {}, info() {} };
    this.git = git;
    this.state = undefined;
    this.scanCache = undefined;
  }

  /** Subscribe to catalog changes (the skill provider invalidates through this). */
  onChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  invalidate() {
    this.scanCache = undefined;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        this.log.warn?.(`research-workbench: change listener failed: ${error?.message ?? error}`);
      }
    }
  }

  /** Read or lazily load the durable state. */
  async load() {
    if (this.state !== undefined) return this.state;
    this.state = normalizeState(await readJsonFile(this.stateFile));
    return this.state;
  }

  async save(state) {
    this.state = state;
    await writeJsonAtomic(this.stateFile, state);
  }

  /** Absolute on-disk location of one source's tree. */
  sourcePath(record) {
    return record.kind === 'local' ? record.localPath : join(this.sourcesDir, record.id);
  }

  /**
   * Absolute path of one shared customization.
   *
   * The file name is a hash because a skill name may collide with a Windows
   * device name or end in a dot; the identity lives inside the JSON.
   * @param sourceId - registered source id.
   * @param name - skill name.
   * @returns the override file path.
   */
  overridePath(sourceId, name) {
    const key = createHash('sha256').update(`${sourceId}\u0000${name}`, 'utf8').digest('hex');
    return join(this.overridesDir, `${key}.json`);
  }

  /**
   * Read one shared customization and trust nothing in it.
   * @param sourceId - registered source id.
   * @param name - skill name.
   * @returns presence, the file's own byte hash, and either the record or the reason it is unusable.
   */
  async readOverride(sourceId, name) {
    const file = this.overridePath(sourceId, name);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') return { file, present: false };
      throw new SkillError(`共享版本不可读：${error?.message ?? error}`, 'corrupt');
    }
    const hash = contentHash(raw);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { file, present: true, hash, error: '共享版本文件不是有效 JSON' };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { file, present: true, hash, error: '共享版本文件不是对象' };
    }
    if (parsed.version !== OVERRIDE_VERSION) {
      return { file, present: true, hash, error: `共享版本版本号 ${String(parsed.version)} 不受支持` };
    }
    if (parsed.sourceId !== sourceId || parsed.name !== name) {
      return { file, present: true, hash, error: '共享版本身份与请求不一致' };
    }
    if (typeof parsed.baseSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.baseSha256)) {
      return { file, present: true, hash, error: '共享版本缺少有效的 baseSha256' };
    }
    try {
      validateSkillDocument(parsed.content, name);
    } catch (error) {
      return { file, present: true, hash, error: error?.message ?? String(error) };
    }
    return {
      file,
      present: true,
      hash,
      record: { version: OVERRIDE_VERSION, sourceId, name, baseSha256: parsed.baseSha256, content: parsed.content },
    };
  }

  /**
   * The freshly scanned row for exactly one upstream skill.
   * @param sourceId - registered source id.
   * @param name - skill name.
   * @returns the row.
   * @throws {SkillError} `not_found` or `conflict` when the identity is ambiguous.
   */
  async requireSkillRow(sourceId, name) {
    if (typeof sourceId !== 'string' || sourceId === '' || typeof name !== 'string' || name === '') {
      throw new SkillError('需要来源与技能名称', 'invalid');
    }
    const rows = await this.scanSkills({ fresh: true });
    const matches = rows.filter(row => row.sourceId === sourceId && row.name === name);
    if (matches.length === 0) throw new SkillError(`未找到技能：${name}`, 'not_found');
    if (matches.length > 1) {
      throw new SkillError('这个技能在来源中有多个 SKILL.md，请先消除重复路径', 'conflict');
    }
    return matches[0];
  }

  /**
   * Save one shared `SKILL.md` version.
   *
   * The caller proves which bytes it edited; a mismatch means somebody else
   * saved first, and the unsaved text is kept by the client instead of being
   * silently replaced.
   * @param request - source id, skill name, complete document, and the hash the editor started from.
   * @returns the refreshed detail.
   */
  async saveSkillOverride({ sourceId, name, content, expectedHash } = {}) {
    const release = await acquireInstallLock(this.lockFile);
    try {
      const row = await this.requireSkillRow(sourceId, name);
      if (row.overrideError !== undefined) {
        throw new SkillError(`共享版本已损坏，请先恢复上游版本：${row.overrideError}`, 'conflict');
      }
      const currentHash = row.customized === true ? row.overrideHash : row.sourceHash;
      if (typeof expectedHash !== 'string' || expectedHash !== currentHash) {
        throw new SkillError('技能内容已被修改，请重新打开后再保存', 'conflict');
      }
      validateSkillDocument(content, name);
      const baseSha256 = row.customized === true ? row.baseSha256 : row.sourceHash;
      await writeJsonAtomic(this.overridePath(sourceId, name), {
        version: OVERRIDE_VERSION,
        sourceId,
        name,
        baseSha256,
        content,
      });
      this.invalidate();
      return await this.skillDetail({ sourceId, name });
    } finally {
      await release();
    }
  }

  /**
   * Drop one shared customization, returning the skill to its upstream file.
   * @param request - source id, skill name, and the hash the operator saw.
   * @returns the refreshed detail.
   */
  async resetSkillOverride({ sourceId, name, expectedHash } = {}) {
    const release = await acquireInstallLock(this.lockFile);
    try {
      const row = await this.requireSkillRow(sourceId, name);
      const currentHash = row.customized === true || row.overrideError !== undefined ? row.overrideHash : row.sourceHash;
      if (typeof expectedHash !== 'string' || expectedHash !== currentHash) {
        throw new SkillError('技能内容已被修改，请重新打开后重试', 'conflict');
      }
      if (row.customized === true || row.overrideError !== undefined) {
        await rm(this.overridePath(sourceId, name), { force: true });
        this.invalidate();
      }
      return await this.skillDetail({ sourceId, name });
    } finally {
      await release();
    }
  }

  requireSource(state, id) {
    const record = state.sources.find(row => row.id === id);
    if (record === undefined) throw new SkillError(`未找到来源：${id}`, 'not_found');
    return record;
  }

  /**
   * Install a GitHub repository as a new source.
   *
   * A shallow clone is preferred because it keeps `git fetch` and commit
   * diffs available for later updates. When git cannot reach the network the
   * same revision is installed from the codeload archive instead, which keeps
   * the complete directory tree (including shared sibling libraries) but
   * degrades updates to whole-tree replacement.
   * @param request - repository URL, optional branch, title, and id.
   * @returns the new source record.
   */
  async addGitHubSource({ url, branch, title, id } = {}) {
    const parsed = parseGitHubUrl(url);
    const requested = sourceIdFrom(id || title, parsed.repo);
    const release = await acquireInstallLock(this.lockFile);
    let staging;
    try {
      const state = await this.load();
      const registered = state.sources.filter(row => row.kind === 'github' && isSameRepository(row.repository, parsed.repository));
      if (registered.length > 0) {
        // One repository is one source: a second subscription would duplicate the
        // whole tree and the skill names it exports.
        return registered.find(row => row.id === requested) ?? registered[0];
      }
      const sourceId = await this.freeSourceId(state, requested);
      const target = join(this.sourcesDir, sourceId);
      staging = join(this.sourcesDir, `.staging-${sourceId}-${randomBytes(4).toString('hex')}`);
      const resolvedBranch = typeof branch === 'string' && branch.trim() !== ''
        ? branch.trim()
        : await resolveDefaultBranch(parsed.repository, parsed.cloneUrl, this.git);
      const record = {
        id: sourceId,
        title: typeof title === 'string' && title.trim() !== '' ? title.trim() : parsed.repository,
        kind: 'github',
        repository: parsed.repository,
        branch: resolvedBranch,
        syncMode: 'git',
        installedAt: new Date().toISOString(),
      };
      let installed = false;
      try {
        await this.git([
          '-c', 'core.longpaths=true',
          'clone',
          '--filter=blob:none',
          '--depth=50',
          '--single-branch',
          '--branch', resolvedBranch,
          parsed.cloneUrl,
          staging,
        ]);
        record.installedRevision = (await this.git(['rev-parse', 'HEAD'], { cwd: staging })).trim();
        installed = true;
      } catch (error) {
        this.log.warn?.(`research-workbench: git clone failed for ${parsed.repository}: ${error?.message ?? error}`);
        await rm(staging, { recursive: true, force: true });
      }
      if (!installed) {
        const head = await fetchBranchHead(parsed.repository, resolvedBranch);
        await downloadRepositoryArchive(parsed.repository, head.sha, staging);
        record.installedRevision = head.sha;
        record.syncMode = 'tarball';
      }
      await placeDirectory(staging, target);
      state.sources.push(record);
      await this.save(state);
      this.invalidate();
      return record;
    } catch (error) {
      if (staging !== undefined) await rm(staging, { recursive: true, force: true }).catch(() => {});
      throw error;
    } finally {
      await release();
    }
  }

  /**
   * The requested id, or the first free `<id>-official`, `<id>-official-2`, …
   * A preset must stay subscribable when another repository already owns its
   * canonical id.
   * @param state - current durable state.
   * @param requested - preferred source id.
   * @returns an id no record or leftover directory holds.
   */
  async freeSourceId(state, requested) {
    let candidate = requested;
    for (let n = 1; ; n += 1) {
      const taken = state.sources.some(row => row.id === candidate) || await pathExists(join(this.sourcesDir, candidate));
      if (!taken) return candidate;
      candidate = n === 1 ? `${requested}-official` : `${requested}-official-${n}`;
    }
  }

  /**
   * Register an existing local folder as a source. Its files are never copied
   * or modified: the workbench reads them where they live.
   * @param request - folder path, optional title and id.
   * @returns the new source record.
   */
  async addLocalSource({ path, title, id } = {}) {
    const state = await this.load();
    const localPath = resolve(String(path ?? '').trim());
    if (localPath === '' || !(await isDirectory(localPath))) {
      throw new SkillError(`不是可用的文件夹：${path}`, 'invalid_directory');
    }
    const sourceId = sourceIdFrom(id || title, basename(localPath));
    if (state.sources.some(row => row.id === sourceId)) throw new SkillError(`来源 ${sourceId} 已存在`, 'duplicate');
    const record = {
      id: sourceId,
      title: typeof title === 'string' && title.trim() !== '' ? title.trim() : basename(localPath),
      kind: 'local',
      localPath,
      syncMode: 'local',
      installedAt: new Date().toISOString(),
    };
    state.sources.push(record);
    await this.save(state);
    this.invalidate();
    return record;
  }

  /**
   * Ask upstream whether a source has moved since it was installed.
   * @param id - source id.
   * @returns the refreshed record.
   */
  async checkSource(id) {
    const state = await this.load();
    const record = this.requireSource(state, id);
    if (record.syncMode === 'local') return record;
    let latest;
    let pendingCommits = [];
    let diffStat = '';
    if (record.syncMode === 'git') {
      const cwd = this.sourcePath(record);
      await this.git(['fetch', 'origin', record.branch, '--depth=50'], { cwd });
      latest = (await this.git(['rev-parse', 'FETCH_HEAD'], { cwd })).trim();
      const log = await this.git(['log', '--date=short', '--pretty=format:%H%x09%ad%x09%s', 'HEAD..FETCH_HEAD'], { cwd });
      pendingCommits = log.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 50).map((line) => {
        const [sha, date, ...subject] = line.split('\t');
        return { sha, date, subject: subject.join(' ') };
      });
      if (pendingCommits.length > 0) {
        diffStat = (await this.git(['diff', '--stat', 'HEAD..FETCH_HEAD'], { cwd })).trim().split('\n').slice(-1)[0] ?? '';
      }
    } else {
      const head = await fetchBranchHead(record.repository, record.branch);
      latest = head.sha;
      if (head.sha !== record.installedRevision) {
        pendingCommits = [{ sha: head.sha, date: head.date, subject: head.message }];
      }
    }
    record.latestRevision = latest;
    record.checkedAt = new Date().toISOString();
    record.aheadCount = latest === record.installedRevision ? 0 : pendingCommits.length || 1;
    this.previews.set(id, { pendingCommits, diffStat });
    await this.save(state);
    return record;
  }

  /**
   * Describe what applying an update would change.
   * @param id - source id.
   * @returns the diff preview for the operator.
   */
  async previewUpdate(id) {
    const record = await this.checkSource(id);
    const preview = this.previews.get(id) ?? { pendingCommits: [], diffStat: '' };
    return {
      id: record.id,
      title: record.title,
      syncMode: record.syncMode,
      installedRevision: record.installedRevision ?? '',
      latestRevision: record.latestRevision ?? '',
      aheadCount: record.aheadCount ?? 0,
      pendingCommits: preview.pendingCommits,
      diffStat: preview.diffStat,
    };
  }

  /**
   * Move one source to the revision discovered by {@link checkSource}.
   *
   * Git sources keep their clone: local edits are discarded, then the fetched
   * revision is fast-forwarded in, falling back to a hard reset when upstream
   * rewrote history. Archive sources are replaced whole, staged first so a
   * failed download cannot leave a half-written tree behind.
   * @param id - source id.
   * @returns the updated record.
   */
  async applyUpdate(id) {
    const state = await this.load();
    const record = this.requireSource(state, id);
    if (record.syncMode === 'local') throw new SkillError('本地目录不支持更新，请在原目录修改', 'unsupported');
    const release = await acquireInstallLock(this.lockFile);
    try {
      const latest = await this.checkSource(id);
      if (latest.latestRevision === record.installedRevision) return record;
      if (record.syncMode === 'git') {
        const cwd = this.sourcePath(record);
        await this.git(['checkout', '--', '.'], { cwd });
        await this.git(['clean', '-fd'], { cwd });
        try {
          await this.git(['merge', '--ff-only', 'FETCH_HEAD'], { cwd });
        } catch {
          await this.git(['reset', '--hard', 'FETCH_HEAD'], { cwd });
        }
        record.installedRevision = (await this.git(['rev-parse', 'HEAD'], { cwd })).trim();
      } else {
        const staging = join(this.sourcesDir, `.update-${record.id}-${randomBytes(4).toString('hex')}`);
        try {
          await downloadRepositoryArchive(record.repository, record.latestRevision, staging);
          await placeDirectory(staging, this.sourcePath(record));
        } catch (error) {
          await rm(staging, { recursive: true, force: true }).catch(() => {});
          throw error;
        }
        record.installedRevision = record.latestRevision;
      }
      record.aheadCount = 0;
      record.installedAt = new Date().toISOString();
      this.previews.delete(id);
      await this.save(state);
      this.invalidate();
      return record;
    } finally {
      await release();
    }
  }

  /**
   * Forget a source. A managed clone is deleted with it; a local folder is
   * only unregistered, never removed.
   * @param id - source id.
   * @returns the remaining source records.
   */
  async removeSource(id) {
    const state = await this.load();
    const record = this.requireSource(state, id);
    if (record.kind === 'github') await rm(this.sourcePath(record), { recursive: true, force: true });
    state.sources = state.sources.filter(row => row.id !== id);
    state.disabledSkills = state.disabledSkills.filter(key => !key.startsWith(`${id}/`));
    this.previews.delete(id);
    await this.save(state);
    this.invalidate();
    return state.sources;
  }

  /**
   * Enable or disable one skill without touching the source tree.
   * @param request - source id, skill name, and the wanted state.
   * @returns the stored qualified keys.
   */
  async setSkillEnabled({ sourceId, name, enabled } = {}) {
    const state = await this.load();
    if (typeof sourceId !== 'string' || typeof name !== 'string') throw new SkillError('需要来源与技能名称', 'invalid');
    const key = `${sourceId}/${name}`;
    const disabled = new Set(state.disabledSkills);
    if (enabled === false) disabled.add(key);
    else disabled.delete(key);
    state.disabledSkills = [...disabled];
    await this.save(state);
    this.invalidate();
    return state.disabledSkills;
  }

  /**
   * Walk every source for `SKILL.md` files.
   *
   * The whole repository is kept on disk, so a skill is described exactly as
   * upstream ships it: its body is never rewritten, and every `../<sibling>/`
   * reference is checked against the real filesystem instead of assumed.
   * @param options - `fresh` bypasses the short-lived scan cache.
   * @returns every discovered skill, in source order.
   */
  async scanSkills({ fresh = false } = {}) {
    if (!fresh && this.scanCache !== undefined && Date.now() - this.scanCache.at < SCAN_TTL_MS) {
      return this.scanCache.rows;
    }
    const state = await this.load();
    const rows = [];
    for (const record of state.sources) {
      const root = this.sourcePath(record);
      if (!(await isDirectory(root))) continue;
      const found = await this.scanSource(record, root, state);
      rows.push(...found);
    }
    const winners = new Map();
    for (const row of rows) {
      const winner = winners.get(row.name);
      if (winner === undefined) winners.set(row.name, row);
      else row.shadowedBy = winner.sourceId;
    }
    this.scanCache = { at: Date.now(), rows };
    return rows;
  }

  async scanSource(record, root, state) {
    const rows = [];
    const walk = async (dir, depth) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      const skillFile = entries.find(entry => entry.isFile() && entry.name === SKILL_FILE);
      if (skillFile !== undefined && depth > 0) {
        const row = await this.describeSkill(record, root, dir, join(dir, SKILL_FILE), state);
        if (row !== undefined) rows.push(row);
      }
      if (depth >= MAX_SCAN_DEPTH) return;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SKIPPED_DIRECTORIES.includes(entry.name)) continue;
        if (entry.name.startsWith('_') || /shared$/i.test(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        await walk(join(dir, entry.name), depth + 1);
      }
    };
    await walk(root, 0);
    return rows;
  }

  async describeSkill(record, root, dir, file, state) {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      this.log.warn?.(`research-workbench: unreadable skill file ${file}: ${error?.message ?? error}`);
      return undefined;
    }
    const parsed = parseFrontmatter(raw);
    if (parsed === undefined) return undefined;
    const name = parsed.data.name;
    const description = parsed.data.description;
    if (typeof name !== 'string' || !SKILL_NAME.test(name)) return undefined;
    if (typeof description !== 'string' || description.trim() === '') return undefined;
    const canonical = canonicalSourceId(record.repository) || record.id;
    if (fieldSpecificReason(canonical, name) !== undefined) return undefined;
    const whenToUse = typeof parsed.data.whenToUse === 'string' ? parsed.data.whenToUse : undefined;
    const metadata = parsed.data.metadata !== null && typeof parsed.data.metadata === 'object' && !Array.isArray(parsed.data.metadata)
      ? parsed.data.metadata
      : undefined;
    const sharedDeps = [];
    for (const sibling of referencedSiblings(raw)) {
      sharedDeps.push({ name: sibling, exists: await isDirectory(join(dir, '..', sibling)) });
    }
    const sourceHash = contentHash(raw);
    const row = {
      name,
      description: description.trim(),
      ...(whenToUse === undefined ? {} : { whenToUse }),
      ...(metadata === undefined ? {} : { metadata }),
      sourceId: record.id,
      sourceTitle: record.title,
      ...(record.repository === undefined ? {} : { repository: record.repository }),
      canonicalSourceId: canonical,
      revision: record.installedRevision ?? '',
      category: categorizeSkill(name, description),
      skillDirPath: dir,
      skillFilePath: file,
      sourceRootPath: root,
      relativePath: relative(root, dir).split(sep).join('/'),
      sharedDeps,
      disabled: state.disabledSkills.includes(`${record.id}/${name}`),
      bodyBytes: Buffer.byteLength(raw),
      sourceHash,
      body: raw,
      content: raw,
      upstreamContent: raw,
    };
    const override = await this.readOverride(record.id, name);
    if (override.present === true) {
      row.overrideHash = override.hash;
      row.overridePath = override.file;
      if (override.error !== undefined) {
        // A readable but unusable file is kept verbatim: the operator decides
        // whether to inspect it or restore the upstream version.
        row.overrideError = override.error;
      } else {
        const edited = parseFrontmatter(override.record.content);
        row.customized = true;
        row.content = override.record.content;
        row.baseSha256 = override.record.baseSha256;
        row.upstreamChanged = override.record.baseSha256 !== sourceHash;
        row.description = edited.data.description.trim();
        if (typeof edited.data.whenToUse === 'string') row.whenToUse = edited.data.whenToUse;
        else delete row.whenToUse;
        row.category = categorizeSkill(name, row.description);
      }
    }
    const guide = guideFor(await loadSkillGuides(), row);
    if (guide !== undefined) row.guide = guide;
    return row;
  }

  /**
   * Read one skill's upstream file and sibling listing for the detail dialog.
   * @param request - source id and skill name.
   * @returns the raw document, metadata, and directory neighbours.
   */
  async skillDetail({ sourceId, name } = {}) {
    const rows = await this.scanSkills({ fresh: true });
    const row = rows.find(item => item.sourceId === sourceId && item.name === name);
    if (row === undefined) throw new SkillError(`未找到技能：${name}`, 'not_found');
    const siblings = [];
    try {
      for (const entry of await readdir(row.skillDirPath, { withFileTypes: true })) {
        siblings.push({ name: entry.name, kind: entry.isDirectory() ? 'directory' : 'file' });
      }
    } catch {
      // A directory that vanished between the scan and the read contributes nothing.
    }
    siblings.sort((left, right) => left.name.localeCompare(right.name));
    return {
      name: row.name,
      description: row.description,
      whenToUse: row.whenToUse ?? '',
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle,
      ...(row.repository === undefined ? {} : { repository: row.repository }),
      canonicalSourceId: row.canonicalSourceId,
      revision: row.revision,
      skillDirPath: row.skillDirPath,
      skillFilePath: row.skillFilePath,
      sharedDeps: row.sharedDeps,
      siblings,
      content: row.content,
      upstreamContent: row.upstreamContent,
      customized: row.customized === true,
      upstreamChanged: row.upstreamChanged === true,
      ...(row.overrideError === undefined ? {} : { overrideError: row.overrideError }),
      ...(row.overridePath === undefined ? {} : { overridePath: row.overridePath }),
      expectedHash: row.customized === true || row.overrideError !== undefined ? row.overrideHash : row.sourceHash,
      ...(row.guide === undefined ? {} : { guide: row.guide }),
    };
  }

  /**
   * Register a local folder of literature the workbench browses in place.
   * @param path - absolute folder path.
   * @returns the stored folder list.
   */
  async addLiteratureDir(path) {
    const state = await this.load();
    const localPath = resolve(String(path ?? '').trim());
    if (localPath === '' || !(await isDirectory(localPath))) {
      throw new SkillError(`不是可用的文件夹：${path}`, 'invalid_directory');
    }
    if (!state.literatureDirs.includes(localPath)) state.literatureDirs.push(localPath);
    await this.save(state);
    this.invalidate();
    return state.literatureDirs;
  }

  /** Forget one literature folder; its files are never touched. */
  async removeLiteratureDir(path) {
    const state = await this.load();
    const localPath = resolve(String(path ?? '').trim());
    state.literatureDirs = state.literatureDirs.filter(entry => resolve(entry) !== localPath);
    await this.save(state);
    this.invalidate();
    return state.literatureDirs;
  }

  /** The catalog and source list the management page renders. */
  async status() {
    const state = await this.load();
    const rows = await this.scanSkills();
    return {
      dataRoot: this.dataRoot,
      sourcesDir: this.sourcesDir,
      sources: state.sources.map(record => ({
        id: record.id,
        title: record.title,
        kind: record.kind,
        ...(record.repository === undefined ? {} : { repository: record.repository }),
        canonicalSourceId: canonicalSourceId(record.repository) || record.id,
        ...(record.branch === undefined ? {} : { branch: record.branch }),
        ...(record.localPath === undefined ? {} : { localPath: record.localPath }),
        syncMode: record.syncMode,
        installedRevision: record.installedRevision ?? '',
        ...(record.latestRevision === undefined ? {} : { latestRevision: record.latestRevision }),
        ...(record.aheadCount === undefined ? {} : { aheadCount: record.aheadCount }),
        ...(record.installedAt === undefined ? {} : { installedAt: record.installedAt }),
        ...(record.checkedAt === undefined ? {} : { checkedAt: record.checkedAt }),
        path: this.sourcePath(record),
      })),
      skills: rows.map(row => ({
        name: row.name,
        description: row.description,
        ...(row.whenToUse === undefined ? {} : { whenToUse: row.whenToUse }),
        sourceId: row.sourceId,
        sourceTitle: row.sourceTitle,
        ...(row.repository === undefined ? {} : { repository: row.repository }),
        canonicalSourceId: row.canonicalSourceId,
        ...(row.guide === undefined ? {} : { guide: row.guide }),
        revision: row.revision,
        category: row.category,
        skillDirPath: row.skillDirPath,
        skillFilePath: row.skillFilePath,
        sharedDeps: row.sharedDeps,
        disabled: row.disabled,
        ...(row.shadowedBy === undefined ? {} : { shadowedBy: row.shadowedBy }),
        ...(row.customized === true ? { customized: true } : {}),
        ...(row.upstreamChanged === true ? { upstreamChanged: true } : {}),
        ...(row.overrideError === undefined ? {} : { overrideError: row.overrideError }),
      })),
      presets: BUILTIN_PRESET_SOURCES.map(preset => ({
        ...preset,
        installed: state.sources.some(row => row.kind === 'github' && isSameRepository(row.repository, preset.url)),
      })),
    };
  }
}

