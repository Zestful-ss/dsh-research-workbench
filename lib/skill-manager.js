/**
 * Skill source manager: install, inspect, update, and scan the upstream skill
 * repositories the workbench hosts, and expose the resulting catalog to both
 * the HTTP surface and the `ctx.skills` provider.
 *
 * @module dsh-research-workbench/skill-manager
 */

import { readdir, readFile, rm } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parse as parseYaml } from 'yaml';

import {
  BUILTIN_PRESET_SOURCES,
  SKILL_NAME,
  SKIPPED_DIRECTORIES,
  SkillError,
  acquireInstallLock,
  downloadRepositoryArchive,
  fetchBranchHead,
  isDirectory,
  normalizeState,
  parseGitHubUrl,
  pathExists,
  placeDirectory,
  readJsonFile,
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
    const state = await this.load();
    const parsed = parseGitHubUrl(url);
    const sourceId = sourceIdFrom(id || title, parsed.repo);
    if (state.sources.some(row => row.id === sourceId)) throw new SkillError(`来源 ${sourceId} 已存在`, 'duplicate');
    const target = join(this.sourcesDir, sourceId);
    if (await pathExists(target)) throw new SkillError(`目录 ${target} 已被占用`, 'duplicate');
    const release = await acquireInstallLock(this.lockFile);
    const staging = join(this.sourcesDir, `.staging-${sourceId}-${randomBytes(4).toString('hex')}`);
    try {
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
      await rm(staging, { recursive: true, force: true }).catch(() => {});
      throw error;
    } finally {
      await release();
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
    const whenToUse = typeof parsed.data.whenToUse === 'string' ? parsed.data.whenToUse : undefined;
    const metadata = parsed.data.metadata !== null && typeof parsed.data.metadata === 'object' && !Array.isArray(parsed.data.metadata)
      ? parsed.data.metadata
      : undefined;
    const sharedDeps = [];
    for (const sibling of referencedSiblings(raw)) {
      sharedDeps.push({ name: sibling, exists: await isDirectory(join(dir, '..', sibling)) });
    }
    return {
      name,
      description: description.trim(),
      ...(whenToUse === undefined ? {} : { whenToUse }),
      ...(metadata === undefined ? {} : { metadata }),
      sourceId: record.id,
      sourceTitle: record.title,
      revision: record.installedRevision ?? '',
      category: categorizeSkill(name, description),
      skillDirPath: dir,
      skillFilePath: file,
      relativePath: relative(root, dir).split(sep).join('/'),
      sharedDeps,
      disabled: state.disabledSkills.includes(`${record.id}/${name}`),
      bodyBytes: Buffer.byteLength(raw),
      body: raw,
    };
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
      revision: row.revision,
      skillDirPath: row.skillDirPath,
      skillFilePath: row.skillFilePath,
      sharedDeps: row.sharedDeps,
      siblings,
      content: row.body,
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
        revision: row.revision,
        category: row.category,
        skillDirPath: row.skillDirPath,
        skillFilePath: row.skillFilePath,
        sharedDeps: row.sharedDeps,
        disabled: row.disabled,
        ...(row.shadowedBy === undefined ? {} : { shadowedBy: row.shadowedBy }),
      })),
      presets: BUILTIN_PRESET_SOURCES.map(preset => ({
        ...preset,
        installed: state.sources.some(row => row.id === preset.id || row.repository === parseRepositoryOf(preset.url)),
      })),
    };
  }
}

function parseRepositoryOf(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  } catch {
    return '';
  }
}
