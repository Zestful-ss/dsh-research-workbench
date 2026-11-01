/**
 * Host HTTP surface of the research workbench.
 *
 * The browser half of the plugin must not reach the filesystem, the workspace
 * registry, or a skill checkout on its own, so every read and write the
 * workbench needs arrives through this one same-origin JSON route, behind a
 * per-boot token and the Host/Origin fence the connection service already owns.
 *
 * @module dsh-research-workbench/workbench-api
 */

import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';

import { SkillError, isDirectory } from './skill-sources.js';

/** Extensions the workbench treats as research material. */
export const MATERIAL_EXTENSIONS = Object.freeze([
  '.pdf', '.md', '.tex', '.bib', '.svg', '.png', '.jpg', '.py', '.m', '.ipynb', '.csv',
]);

const MATERIAL_SET = new Set(MATERIAL_EXTENSIONS);
const SCAN_SKIP = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.system']);
const WORKSPACE_FILE_LIMIT = 16;
const BODY_LIMIT_BYTES = 128 * 1024;
const OPEN_TIMEOUT_MS = 15_000;

const ERROR_STATUS = Object.freeze({
  busy: 423,
  not_found: 404,
  invalid: 400,
  invalid_url: 400,
  invalid_name: 400,
  invalid_directory: 400,
  duplicate: 409,
  conflict: 409,
  corrupt: 500,
  unsupported: 400,
  register_failed: 500,
  network: 502,
  git_failed: 502,
  limit_exceeded: 413,
});

/** The default folder Zotero keeps attachment copies in, offered as a hint only. */
const ZOTERO_STORAGE_HINT = 'E:/zotero_file/storage';

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
});

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function fail(message, status, code) {
  return json({ error: message, ...(code === undefined ? {} : { code }) }, status);
}

/**
 * Build the request handler.
 * @param options - plugin context, source manager, boot token, plugin version,
 *   and the optional-service resolver supplied by the plugin entry.
 * @returns the Fetch handler the connection route calls.
 */
export function createWorkbenchHandler({ ctx, manager, roles, token, version, resolve }) {
  const service = resolve ?? ((serviceName) => {
    try {
      return ctx.get(serviceName);
    } catch {
      return undefined;
    }
  });

  return async function workbenchFetch(request) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET') {
        const rejection = rejectUntrusted(request, ctx);
        if (rejection !== undefined) return rejection;
        return await readRoute(url, { ctx, manager, roles, service, token, version });
      }
      if (request.method !== 'POST') return fail('不支持此请求方法', 405);
      if (request.headers.get('sec-fetch-site') === 'cross-site') return fail('拒绝跨站请求', 403);
      const rejection = rejectUntrusted(request, ctx);
      if (rejection !== undefined) return rejection;
      if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
        return fail('需要 JSON 请求', 415);
      }
      if (request.headers.get('x-workbench-token') !== token) return fail('请重新打开面板后重试', 403, 'INVALID_TOKEN');
      const raw = await request.text();
      if (Buffer.byteLength(raw) > BODY_LIMIT_BYTES) return fail('请求过大', 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return fail('请求 JSON 无法解析', 400);
      }
      if (body === null || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') {
        return fail('缺少 action', 400);
      }
      return await writeRoute(body, { ctx, manager, roles, service, version });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function rejectUntrusted(request, ctx) {
  const connection = ctx.get('connection');
  const rejection = connection?.requestRejection?.(request);
  if (rejection === undefined) return undefined;
  return fail('请求未通过宿主校验', rejection, 'REJECTED');
}

function errorResponse(error) {
  if (error instanceof SkillError) {
    const status = ERROR_STATUS[error.code] ?? 500;
    return fail(error.message, status, error.code);
  }
  const message = String(error?.message ?? error);
  return fail(message, 500, 'internal');
}

/**
 * The role view must never take bootstrap down with it: a corrupt role file
 * still leaves the classic workbench and ordinary Agents usable.
 */
async function roleSnapshot(roles) {
  if (roles === undefined || typeof roles.view !== 'function') return null;
  try {
    return await roles.view();
  } catch (error) {
    return {
      compatible: false,
      reason: 'roles',
      error: String(error?.message ?? error),
      templates: [],
      dsBot: { ok: false, version: null, statePath: null, home: null, reason: 'roles', detail: null },
      entries: [],
      pending: [],
    };
  }
}

async function readRoute(url, deps) {
  const action = url.searchParams.get('action') ?? 'bootstrap';
  switch (action) {
    case 'bootstrap':
      return json(await bootstrap(deps));
    case 'skill-detail':
      return json(await deps.manager.skillDetail({
        sourceId: url.searchParams.get('sourceId') ?? '',
        name: url.searchParams.get('skillName') ?? '',
      }));
    default:
      return fail(`未知操作：${action}`, 400);
  }
}

async function writeRoute(body, deps) {
  const { ctx, manager, roles, service } = deps;
  switch (body.action) {
    case 'prepare-role': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const workspaceId = typeof body.workspaceId === 'string' && body.workspaceId.trim() !== '' ? body.workspaceId.trim() : undefined;
      if (workspaceId !== undefined) await requireProject(service, workspaceId);
      const result = await roles.prepare({
        templateId: body.templateId,
        name: body.name,
        skills: body.skills,
        ...(workspaceId === undefined ? {} : { workspaceId }),
        ...(typeof body.model === 'string' ? { model: body.model } : {}),
        ...(typeof body.workDir === 'string' ? { workDir: body.workDir } : {}),
      });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'complete-role': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const result = await roles.complete({
        transactionId: body.transactionId,
        botId: body.botId,
      });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'cancel-role': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const result = await roles.cancel({ transactionId: body.transactionId });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'set-role-skills': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const result = await roles.setSkills({ botId: body.botId, skills: body.skills });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'remove-role': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const result = await roles.remove({ botId: body.botId });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'set-role-project': {
      if (roles === undefined) throw new SkillError('宿主未提供科研角色服务', 'unsupported');
      const target = typeof body.workspaceId === 'string' && body.workspaceId.trim() !== '' ? body.workspaceId.trim() : null;
      if (target !== null) await requireProject(service, target);
      const expected = typeof body.expectedWorkspaceId === 'string' && body.expectedWorkspaceId.trim() !== ''
        ? body.expectedWorkspaceId.trim()
        : (body.expectedWorkspaceId === null ? null : undefined);
      const result = await roles.setProject({
        botId: typeof body.botId === 'string' ? body.botId : '',
        workspaceId: target,
        ...(expected === undefined ? {} : { expectedWorkspaceId: expected }),
      });
      return json({ ...result, roleStatus: await roleSnapshot(roles) });
    }
    case 'add-workspace': {
      const registry = service('workspaceRegistry');
      if (registry === undefined) throw new SkillError('宿主未提供工作区服务', 'unsupported');
      const path = resolve(String(body.path ?? '').trim());
      if (!(await isDirectory(path))) throw new SkillError(`不是可用的文件夹：${body.path}`, 'invalid_directory');
      const title = typeof body.title === 'string' && body.title.trim() !== '' ? body.title.trim() : basename(path);
      const workspace = (await registry.resolveByPath(path)) ?? (await registry.create(path, title));
      return json({ workspace: summarizeWorkspace(workspace) });
    }
    case 'create-workspace': {
      const registry = service('workspaceRegistry');
      if (registry === undefined) throw new SkillError('宿主未提供工作区服务', 'unsupported');
      const parent = resolve(String(body.parentPath ?? '').trim());
      if (!isAbsolute(String(body.parentPath ?? '').trim())) {
        throw new SkillError('请填写父文件夹的绝对路径', 'invalid_directory');
      }
      const name = normalizeFolderName(body.name);
      if (!(await isDirectory(parent))) throw new SkillError(`父文件夹不可用：${body.parentPath}`, 'invalid_directory');
      const path = join(parent, name);
      try {
        // Exclusive and non-recursive: an existing folder is the user's, never ours
        // to adopt as a newly created project.
        await mkdir(path);
      } catch (error) {
        if (error?.code === 'EEXIST') {
          throw new SkillError(`文件夹已存在：${path}。请改用“选择已有文件夹”登记它`, 'duplicate');
        }
        throw new SkillError(`无法创建文件夹 ${path}：${error?.message ?? error}`, 'invalid_directory');
      }
      let workspace;
      try {
        workspace = await registry.create(path, name);
      } catch (error) {
        // The folder is the user's file system: keep it and point at the existing way in.
        throw new SkillError(
          `文件夹已创建：${path}，但登记为项目失败：${error?.message ?? error}。可用“选择已有文件夹”登记它`,
          'register_failed',
        );
      }
      return json({ workspace: summarizeWorkspace(workspace) });
    }
    case 'open-native-path': {
      const controller = service('sessionController');
      if (controller?.openWorkspacePath === undefined) throw new SkillError('宿主未提供系统打开能力', 'unsupported');
      const target = resolve(String(body.path ?? '').trim());
      if (!(await pathExists(target))) throw new SkillError(`路径不存在：${body.path}`, 'invalid_directory');
      const mode = body.mode === 'reveal' ? 'reveal' : 'open';
      await controller.openWorkspacePath({ path: target, action: mode }, AbortSignal.timeout(OPEN_TIMEOUT_MS));
      return json({ opened: true });
    }
    case 'add-literature-dir': {
      await manager.addLiteratureDir(body.path);
      return json(await literatureFiles(manager));
    }
    case 'remove-literature-dir': {
      await manager.removeLiteratureDir(body.path);
      return json(await literatureFiles(manager));
    }
    case 'add-skill-source': {
      const source = body.kind === 'local'
        ? await manager.addLocalSource({ path: body.path, title: body.title, id: body.id })
        : await manager.addGitHubSource({ url: body.url, branch: body.branch, title: body.title, id: body.id });
      return json({ source, skillStatus: await manager.status() });
    }
    case 'check-skill-source': {
      const source = await manager.checkSource(String(body.sourceId ?? ''));
      return json({ source, skillStatus: await manager.status() });
    }
    case 'preview-skill-update':
      return json({ preview: await manager.previewUpdate(String(body.sourceId ?? '')) });
    case 'apply-skill-update': {
      const source = await manager.applyUpdate(String(body.sourceId ?? ''));
      return json({ source, skillStatus: await manager.status() });
    }
    case 'remove-skill-source': {
      const sources = await manager.removeSource(String(body.sourceId ?? ''));
      return json({ sources, skillStatus: await manager.status() });
    }
    case 'toggle-skill': {
      const disabledSkills = await manager.setSkillEnabled({
        sourceId: String(body.sourceId ?? ''),
        name: String(body.name ?? ''),
        enabled: body.enabled !== false,
      });
      return json({ disabledSkills, skillStatus: await manager.status() });
    }
    default:
      return fail(`未知操作：${body.action}`, 400);
  }
}

async function bootstrap({ ctx, manager, roles, service, token, version }) {
  const skillStatus = await manager.status();
  const state = await manager.load();
  const filesByWorkspace = {};
  /** `null` when the registry is unavailable, else one boolean per project. */
  let workspaceAvailability = null;
  const registry = service('workspaceRegistry');
  if (registry !== undefined) {
    workspaceAvailability = {};
    for (const workspace of registry.list()) {
      filesByWorkspace[workspace.id] = await recentFiles(workspace.path, WORKSPACE_FILE_LIMIT);
      workspaceAvailability[workspace.id] = await isDirectory(workspace.path);
    }
  }
  return {
    token,
    version,
    dataRoot: skillStatus.dataRoot,
    skillStatus,
    roleStatus: await roleSnapshot(roles),
    filesByWorkspace,
    workspaceAvailability,
    literatureDirs: state.literatureDirs,
    literatureFiles: await literatureFiles(manager),
    zoteroHint: (await pathExists(ZOTERO_STORAGE_HINT)) ? ZOTERO_STORAGE_HINT : null,
  };
}

function summarizeWorkspace(workspace) {
  return {
    id: workspace.id,
    title: workspace.title,
    path: workspace.path,
    sessionIds: [...workspace.sessionIds],
  };
}

/** Reserved device names on Windows; a folder with one of these cannot be made. */
const RESERVED_FOLDER = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * One folder name, not a path. The project is created inside the parent the
 * user picked, so a name can never escape it.
 * @param value - untrusted folder name.
 * @returns the trimmed name.
 * @throws {SkillError} with code `invalid_name`.
 */
export function normalizeFolderName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '') throw new SkillError('请填写项目名称', 'invalid_name');
  if (name === '.' || name === '..') throw new SkillError('项目名称不能是 . 或 ..', 'invalid_name');
  if (/[\\/:*?"<>|]/.test(name)) throw new SkillError('项目名称不能包含 \\ / : * ? " < > |', 'invalid_name');
  if (/[\u0000-\u001f\u007f]/.test(name)) throw new SkillError('项目名称不能包含控制字符', 'invalid_name');
  if (RESERVED_FOLDER.test(name)) throw new SkillError(`${name} 是系统保留名称，请换一个`, 'invalid_name');
  if (/[. ]$/.test(name)) throw new SkillError('项目名称不能以空格或句点结尾', 'invalid_name');
  if (name.length > 80) throw new SkillError('项目名称最多 80 个字符', 'invalid_name');
  return name;
}

/**
 * Resolve one project to a registry entry whose folder still exists.
 * @param service - optional-service resolver.
 * @param workspaceId - registry id of the project.
 * @returns the registry workspace.
 * @throws {SkillError} when the registry, the project, or its folder is gone.
 */
async function requireProject(service, workspaceId) {
  const registry = service('workspaceRegistry');
  if (registry === undefined) throw new SkillError('宿主未提供工作区服务', 'unsupported');
  const workspace = registry.get(workspaceId);
  if (workspace === undefined) throw new SkillError('找不到该项目，请刷新后重试', 'not_found');
  if (!(await isDirectory(workspace.path))) throw new SkillError(`项目文件夹不可用：${workspace.path}`, 'invalid_directory');
  return workspace;
}

/**
 * Newest research files under one folder, one directory level deep.
 *
 * A research project keeps its inputs at the top (`paper.tex`, figures, data)
 * and its sections one level down (`figures/`, `data/`), so a deeper walk costs
 * time without adding anything the workbench can act on.
 * @param root - folder to scan; a missing folder yields no rows.
 * @param limit - maximum rows returned.
 * @returns file rows sorted by modification time, newest first.
 */
export async function recentFiles(root, limit) {
  const rows = [];
  const visit = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!MATERIAL_SET.has(ext)) continue;
      const path = join(dir, entry.name);
      try {
        const info = await stat(path);
        rows.push({
          name: entry.name,
          path,
          relativePath: path.slice(root.length + 1).split('\\').join('/'),
          ext,
          size: info.size,
          mtimeMs: info.mtimeMs,
        });
      } catch {
        // A file that disappeared mid-scan is not worth reporting.
      }
    }
  };
  await visit(root);
  let children = [];
  try {
    children = (await readdir(root, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && !SCAN_SKIP.has(entry.name) && !entry.name.startsWith('.'))
      .map(entry => entry.name);
  } catch {
    children = [];
  }
  for (const child of children) await visit(join(root, child));
  rows.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return rows.slice(0, limit);
}

async function literatureFiles(manager) {
  const state = await manager.load();
  const byDir = {};
  for (const dir of state.literatureDirs) byDir[dir] = await recentFiles(dir, WORKSPACE_FILE_LIMIT);
  return { literatureDirs: state.literatureDirs, literatureFiles: byDir };
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
