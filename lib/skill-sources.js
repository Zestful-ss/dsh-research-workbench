/**
 * Upstream skill sources: GitHub repositories and local directories that hold
 * third-party Agent Skills (`<dir>/SKILL.md`) together with any shared
 * sibling libraries those skills reference (`../nature-shared/...`).
 *
 * A source is stored as the repository's COMPLETE directory tree under
 * `sources/<id>/`. Nothing is rewritten, so relative references to sibling
 * shared libraries keep resolving exactly as upstream publishes them.
 *
 * @module dsh-research-workbench/skill-sources
 */

import { createWriteStream } from 'node:fs';
import { mkdir, open, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomBytes } from 'node:crypto';

/** Public skill-name grammar, mirrored from `@deepseek-ai/dsh-skill`. */
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Failure with a stable business code the HTTP layer maps to a status. */
export class SkillError extends Error {
  constructor(message, code = 'invalid') {
    super(message);
    this.name = 'SkillError';
    this.code = code;
  }
}

/** Operator-facing preset sources offered for one-click subscription. */
export const BUILTIN_PRESET_SOURCES = Object.freeze([
  Object.freeze({
    id: 'nature-skills',
    title: 'NatureSkills',
    url: 'https://github.com/Yuan1z0825/nature-skills',
    branch: 'main',
    description: '论文阅读、精读、写作、润色、审稿回复与汇报技能集（含 nature-shared 共享依赖）',
  }),
  Object.freeze({
    id: 'figures4papers',
    title: 'figures4papers',
    url: 'https://github.com/ChenLiu-1996/figures4papers',
    branch: 'main',
    description: '发表级科研绘图（scientific-figure-making）与 Matplotlib 规范',
  }),
  Object.freeze({
    id: 'book-to-skill',
    title: 'book-to-skill',
    url: 'https://github.com/virgiliojr94/book-to-skill',
    branch: 'master',
    description: '将专业书籍与长文档整理为按需检索的 Agent Skill',
  }),
]);

const GIT_TIMEOUT_MS = 120_000;
/**
 * Whole-archive download budget. A research repository is tens of megabytes
 * and a home link can take minutes, so this is deliberately generous: the
 * 100 MB size cap, not the clock, is what bounds the work.
 */
const DOWNLOAD_TIMEOUT_MS = 600_000;
const TARBALL_LIMIT_BYTES = 100 * 1024 * 1024;
const SOURCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Directories never walked while scanning a source for skills. */
export const SKIPPED_DIRECTORIES = Object.freeze([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  '.system',
  '.github',
]);

/**
 * Resolve the plugin's data root: `$DSH_HOME/dsh-research-workbench`, where
 * `$DSH_HOME` follows the harness rule (an explicit `DSH_HOME` wins, a blank
 * one is treated as unset, otherwise `~/.dsh`).
 * @param env - environment mapping used to read `DSH_HOME`.
 * @returns the absolute data root.
 */
export function resolveWorkbenchHome(env = process.env) {
  const configured = typeof env.DSH_HOME === 'string' ? env.DSH_HOME.trim() : '';
  return join(configured === '' ? join(homedir(), '.dsh') : resolve(configured), 'dsh-research-workbench');
}

/** The durable state of every managed source and operator preference. */
function emptyState() {
  return { version: 1, sources: [], disabledSkills: [], literatureDirs: [], pinnedProjects: [] };
}

/**
 * Normalize a persisted state object, dropping rows that can no longer work.
 * @param value - parsed JSON, or anything a corrupted file held.
 * @returns a complete state with only well-formed records.
 */
export function normalizeState(value) {
  const base = emptyState();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return base;
  const rows = Array.isArray(value.sources) ? value.sources : [];
  const seen = new Set();
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue;
    if (typeof row.id !== 'string' || !SOURCE_ID_RE.test(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    base.sources.push({
      id: row.id,
      title: typeof row.title === 'string' && row.title.trim() !== '' ? row.title.trim() : row.id,
      kind: row.kind === 'local' ? 'local' : 'github',
      ...(typeof row.repository === 'string' ? { repository: row.repository } : {}),
      ...(typeof row.branch === 'string' && row.branch !== '' ? { branch: row.branch } : {}),
      ...(typeof row.localPath === 'string' ? { localPath: row.localPath } : {}),
      syncMode: row.syncMode === 'tarball' || row.syncMode === 'local' ? row.syncMode : 'git',
      ...(typeof row.installedRevision === 'string' ? { installedRevision: row.installedRevision } : {}),
      ...(typeof row.installedAt === 'string' ? { installedAt: row.installedAt } : {}),
      ...(typeof row.checkedAt === 'string' ? { checkedAt: row.checkedAt } : {}),
      ...(typeof row.latestRevision === 'string' ? { latestRevision: row.latestRevision } : {}),
      ...(typeof row.aheadCount === 'number' ? { aheadCount: row.aheadCount } : {}),
    });
  }
  base.disabledSkills = stringList(value.disabledSkills);
  base.literatureDirs = stringList(value.literatureDirs);
  base.pinnedProjects = stringList(value.pinnedProjects);
  return base;
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed === '' || out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

/**
 * Parse and validate an operator-supplied GitHub repository link.
 * @param rawUrl - URL text from the workbench surface.
 * @returns the owner, repository name, and the clone address.
 * @throws {SkillError} when the link is not a plain HTTPS github.com repository.
 */
export function parseGitHubUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl ?? '').trim());
  } catch {
    throw new SkillError('无效的 GitHub 链接', 'invalid_url');
  }
  if (url.protocol !== 'https:') throw new SkillError('仅支持 HTTPS 的 GitHub 链接', 'invalid_url');
  if (url.hostname.toLowerCase() !== 'github.com') throw new SkillError('仅支持 github.com 来源', 'invalid_url');
  if (url.username !== '' || url.password !== '') throw new SkillError('GitHub 链接中不能包含用户信息', 'invalid_url');
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) throw new SkillError('链接缺少 repository 路径', 'invalid_url');
  const owner = safeDecode(segments[0]);
  let repo = safeDecode(segments[1]);
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) {
    throw new SkillError('无效的 GitHub 仓库名称', 'invalid_url');
  }
  if (owner.startsWith('.') || repo.startsWith('.')) throw new SkillError('无效的 GitHub 仓库名称', 'invalid_url');
  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    httpsUrl: `https://github.com/${owner}/${repo}`,
  };
}

function safeDecode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Derive the source id for a repository or local folder.
 * @param hint - preferred id (a preset id or the operator's text).
 * @param fallback - text used when `hint` is empty.
 * @returns an id matching `/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/`.
 */
export function sourceIdFrom(hint, fallback) {
  const text = String(hint ?? '').trim() || String(fallback ?? '').trim();
  const cleaned = text.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 64);
  if (cleaned === '') throw new SkillError('来源需要可用的名称', 'invalid_name');
  if (!SOURCE_ID_RE.test(cleaned)) throw new SkillError(`来源名称不可用：${text}`, 'invalid_name');
  return cleaned;
}

/** Read JSON, answering `undefined` for a missing or unparsable file. */
export async function readJsonFile(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Write JSON atomically: a sibling temp file, then one rename. */
export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/**
 * Take the plugin-wide install lock.
 *
 * `wx` creation is the atomic claim. A lock left by a dead process (a crashed
 * run) is cleared and retried once; a live one reports `busy` so the HTTP
 * layer answers 423 instead of running two clones at once.
 * @param lockPath - absolute lock file path.
 * @returns the release function.
 * @throws {SkillError} with code `busy` while another run holds the lock.
 */
export async function acquireInstallLock(lockPath) {
  await mkdir(dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      } finally {
        await handle.close();
      }
      return async () => {
        await unlink(lockPath).catch(() => {});
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (attempt === 1) throw new SkillError('另一个技能同步任务正在运行', 'busy');
      const holder = await readJsonFile(lockPath);
      const pid = holder?.pid;
      if (typeof pid === 'number' && pid !== process.pid && isProcessAlive(pid)) {
        throw new SkillError('另一个技能同步任务正在运行', 'busy');
      }
      await rm(lockPath, { force: true });
    }
  }
  throw new SkillError('另一个技能同步任务正在运行', 'busy');
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

/**
 * Run one git command with a hard timeout and no interactive prompts.
 * @param args - git arguments after the program name.
 * @param options - working directory and timeout.
 * @returns captured stdout.
 * @throws {SkillError} with code `git_failed` when git is missing or refuses.
 */
export async function runGit(args, { cwd, timeoutMs = GIT_TIMEOUT_MS } = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    let child;
    try {
      child = spawn('git', args, {
        cwd,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: 'echo',
          GCM_INTERACTIVE: 'never',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      rejectPromise(new SkillError(`无法执行 git：${error?.message ?? error}`, 'git_failed'));
      return;
    }
    const out = [];
    const err = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new SkillError(`git ${args[0]} 超时`, 'git_failed'));
    }, timeoutMs);
    timer.unref?.();
    child.stdout.on('data', (chunk) => out.push(chunk));
    child.stderr.on('data', (chunk) => err.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      const message = error?.code === 'ENOENT' ? '未找到 git 可执行文件' : `git 启动失败：${error?.message ?? error}`;
      rejectPromise(new SkillError(message, 'git_failed'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise(Buffer.concat(out).toString('utf8'));
        return;
      }
      const stderr = Buffer.concat(err).toString('utf8').trim();
      const lines = stderr.split('\n').map(line => line.trim()).filter(Boolean);
      const decisive = lines.find(line => /^(fatal|error):/i.test(line)) ?? lines.slice(-2).join(' ');
      rejectPromise(new SkillError(`git ${args[0]} 失败（${code}）：${decisive.slice(0, 300) || '无输出'}`, 'git_failed'));
    });
  });
}

async function githubJson(path, { timeoutMs = 20_000 } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-research-workbench',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new SkillError(`GitHub API ${path} 返回 ${response.status}`, 'network');
  return await response.json();
}

/**
 * Resolve a repository's default branch.
 * @param repository - `owner/repo`.
 * @param url - a clone address whose symref git can report.
 * @param git - git runner, injectable for tests.
 * @returns the default branch name, `main` when nothing reports one.
 */
export async function resolveDefaultBranch(repository, url, git = runGit) {
  try {
    const output = await git(['ls-remote', '--symref', url, 'HEAD']);
    for (const line of output.split('\n')) {
      const match = /^ref:\s+refs\/heads\/(\S+)\s+HEAD$/.exec(line.trim());
      if (match !== null) return match[1];
    }
  } catch {
    // Fall through to the API: git may be missing while the network works.
  }
  try {
    const payload = await githubJson(`/repos/${repository}`);
    if (typeof payload?.default_branch === 'string' && payload.default_branch !== '') return payload.default_branch;
  } catch {
    // A repository that answers nothing still gets the conventional default.
  }
  return 'main';
}

/**
 * Read the head commit of one remote branch.
 * @param repository - `owner/repo`.
 * @param branch - branch name.
 * @returns the commit sha, subject line, and date.
 */
export async function fetchBranchHead(repository, branch) {
  const payload = await githubJson(`/repos/${repository}/commits/${encodeURIComponent(branch)}`);
  const sha = payload?.sha;
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new SkillError(`无法读取 ${repository}@${branch} 的最新提交`, 'network');
  }
  return {
    sha,
    message: typeof payload?.commit?.message === 'string' ? payload.commit.message.split('\n')[0] : '',
    date: typeof payload?.commit?.author?.date === 'string' ? payload.commit.author.date.slice(0, 10) : '',
  };
}

/** Reject archive entries that would escape the destination directory. */
function archiveEntryAllowed(entryPath) {
  const normalized = String(entryPath).replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) return false;
  return !normalized.split('/').some(segment => segment === '..');
}

/**
 * Download a repository archive for one commit and unpack its complete tree.
 *
 * The GitHub archive wraps everything in one `owner-repo-sha/` directory, so
 * one strip level lands the repository root exactly at `destination`.
 * @param repository - `owner/repo`.
 * @param sha - 40-character commit.
 * @param destination - empty or absent directory to fill.
 */
export async function downloadRepositoryArchive(repository, sha, destination) {
  const response = await fetch(`https://codeload.github.com/${repository}/tar.gz/${sha}`, {
    headers: { 'user-agent': 'dsh-research-workbench' },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new SkillError(`下载 ${repository}@${sha} 失败：${response.status}`, 'network');
  const declared = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > TARBALL_LIMIT_BYTES) {
    throw new SkillError(`仓库压缩包超过上限 ${Math.round(TARBALL_LIMIT_BYTES / 1024 / 1024)} MB`, 'limit_exceeded');
  }
  if (response.body === null) throw new SkillError('仓库压缩包没有内容', 'network');
  await mkdir(destination, { recursive: true });
  const archivePath = join(destination, `.dsh-rw-${randomBytes(6).toString('hex')}.tar.gz`);
  let seen = 0;
  const counter = new TransformStream({
    transform(chunk, controller) {
      seen += chunk.byteLength;
      if (seen > TARBALL_LIMIT_BYTES) {
        controller.error(new SkillError(`仓库压缩包超过上限 ${Math.round(TARBALL_LIMIT_BYTES / 1024 / 1024)} MB`, 'limit_exceeded'));
        return;
      }
      controller.enqueue(chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body.pipeThrough(counter)), createWriteStream(archivePath));
  } catch (error) {
    await rm(archivePath, { force: true });
    if (error instanceof SkillError) throw error;
    throw new SkillError(`下载仓库压缩包失败：${error?.message ?? error}`, 'network');
  }
  const { x } = await import('tar');
  try {
    await x({
      file: archivePath,
      cwd: destination,
      strip: 1,
      filter: archiveEntryAllowed,
    });
  } finally {
    await rm(archivePath, { force: true });
  }
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Replace a directory with a staged copy, keeping the old one until the swap.
 * @param staged - complete new tree.
 * @param target - live tree to replace.
 */
async function swapDirectory(staged, target) {
  const backup = `${target}.old-${randomBytes(4).toString('hex')}`;
  const hadTarget = await pathExists(target);
  if (hadTarget) await rename(target, backup);
  try {
    await rename(staged, target);
  } catch (error) {
    if (hadTarget) await rename(backup, target).catch(() => {});
    throw error;
  }
  if (hadTarget) await rm(backup, { recursive: true, force: true });
}

/**
 * Atomically place a staged tree at `target`, replacing whatever sits there.
 * @param staged - prepared directory.
 * @param target - final location.
 */
export async function placeDirectory(staged, target) {
  await mkdir(dirname(target), { recursive: true });
  if (await pathExists(target)) await swapDirectory(staged, target);
  else await rename(staged, target);
}
