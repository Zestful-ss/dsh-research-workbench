/**
 * Behavior tests for the research workbench's host half: upstream source
 * scanning (shared sibling libraries included), the `ctx.skills` provider
 * contract, and the HTTP surface's authorization fence.
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { SkillSourceManager, categorizeSkill, parseFrontmatter, referencedSiblings } from '../lib/skill-manager.js';
import { BUILTIN_PRESET_SOURCES, SkillError, acquireInstallLock, parseGitHubUrl } from '../lib/skill-sources.js';
import { createWorkbenchHandler } from '../lib/workbench-api.js';
import { createSkillProvider } from '../lib/index.js';
import { guideFor, loadSkillGuides } from '../lib/skill-guides.js';

const API = 'http://127.0.0.1/api/dsh-research-workbench';
const TOKEN = 'test-token';

const WRITING_SKILL = `---
name: nature-writing
description: 论文写作、改写与润色
whenToUse: 当需要改写或润色论文段落时
metadata:
  upstream: nature-skills
---
# Nature Writing

Read ../nature-shared/journal-profiles.md before choosing a target journal.
Also consult ../nature-shared/missing-lib for the appendix.
`;

const READING_SKILL = `---
name: nature-reading
description: 论文精读与要点提取
---
# Nature Reading

Summarize the method, experiments, and conclusions.
`;

const FIGURE_SKILL = `---
name: scientific-figure-making
description: 发表级科研绘图与配色规范
---
# Scientific Figure Making

Use Matplotlib with the documented palette.
`;

const IGNORED_SKILL = `---
name: Not A Skill Name
description: invalid name, ignored
---
body
`;

let root;
let fixture;
let manager;

async function writeFileAt(path, content) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content, 'utf8');
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-rw-test-'));
  fixture = join(root, 'upstream');
  await writeFileAt(join(fixture, 'nature-shared', 'journal-profiles.md'), '# Journal profiles\n');
  await writeFileAt(join(fixture, 'nature-writing', 'SKILL.md'), WRITING_SKILL);
  await writeFileAt(join(fixture, 'nature-reading', 'SKILL.md'), READING_SKILL);
  await writeFileAt(join(fixture, 'figures', 'scientific-figure-making', 'SKILL.md'), FIGURE_SKILL);
  await writeFileAt(join(fixture, 'broken', 'SKILL.md'), IGNORED_SKILL);
  await writeFileAt(join(fixture, 'notes.md'), 'not a skill\n');
  await writeFileAt(join(root, 'papers', 'one.pdf'), 'pdf');
  manager = new SkillSourceManager({ dataRoot: join(root, 'home') });
  await manager.addLocalSource({ path: fixture, title: 'Fixture skills', id: 'fixture' });
});

after(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
});

describe('frontmatter parsing', () => {
  it('splits frontmatter from the body and keeps the body verbatim', () => {
    const parsed = parseFrontmatter(WRITING_SKILL);
    assert.equal(parsed.data.name, 'nature-writing');
    assert.equal(parsed.body.startsWith('# Nature Writing'), true);
  });

  it('answers undefined without frontmatter', () => {
    assert.equal(parseFrontmatter('# no frontmatter\n'), undefined);
    assert.equal(parseFrontmatter(''), undefined);
  });

  it('collects every referenced sibling once', () => {
    assert.deepEqual(referencedSiblings(WRITING_SKILL), ['nature-shared']);
  });
});

describe('source scanning', () => {
  it('finds nested skills and resolves shared siblings on disk', async () => {
    const rows = await manager.scanSkills({ fresh: true });
    const byName = new Map(rows.map(row => [row.name, row]));
    assert.equal(byName.has('nature-writing'), true);
    assert.equal(byName.has('nature-reading'), true);
    assert.equal(byName.has('scientific-figure-making'), true);
    assert.equal(rows.some(row => row.name === 'Not A Skill Name'), false);
    const writing = byName.get('nature-writing');
    assert.deepEqual(writing.sharedDeps, [{ name: 'nature-shared', exists: true }]);
    assert.equal(writing.category, 'writing');
    assert.equal(byName.get('nature-reading').category, 'reading');
    assert.equal(byName.get('scientific-figure-making').category, 'figure');
    assert.equal(writing.relativePath, 'nature-writing');
    assert.equal(byName.get('scientific-figure-making').relativePath, 'figures/scientific-figure-making');
  });

  it('leaves the upstream file byte-identical', async () => {
    const path = join(fixture, 'nature-writing', 'SKILL.md');
    const before = await readFile(path, 'utf8');
    await manager.scanSkills({ fresh: true });
    assert.equal(await readFile(path, 'utf8'), before);
  });

  it('reports a missing shared sibling instead of assuming it', async () => {
    const path = join(fixture, 'nature-writing', 'SKILL.md');
    await writeFileAt(path, `${WRITING_SKILL}\n../ghost-lib/x.md\n`);
    const rows = await manager.scanSkills({ fresh: true });
    const writing = rows.find(row => row.name === 'nature-writing');
    assert.deepEqual(writing.sharedDeps, [
      { name: 'nature-shared', exists: true },
      { name: 'ghost-lib', exists: false },
    ]);
    await writeFileAt(path, WRITING_SKILL);
  });
});

describe('skill provider contract', () => {
  const roleSkills = [
    { sourceId: 'fixture', name: 'nature-writing' },
    { sourceId: 'fixture', name: 'nature-reading' },
    { sourceId: 'fixture', name: 'scientific-figure-making' },
  ];
  const roleStore = {
    hasAny: async () => true,
    resolveSession: async () => ({ status: 'role', via: 'role', botId: 'bot-fixture', templateId: 'fixture', skills: roleSkills }),
  };
  const agent = { id: 'session-fixture', session: { id: 'session-fixture' } };

  it('lists valid candidates pointing at the skill directory', async () => {
    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    const candidates = await provider.list();
    assert.equal(candidates.length, 3);
    const writing = candidates.find(candidate => candidate.name === 'nature-writing');
    assert.equal(writing.provider, 'research-workbench');
    assert.equal(writing.rank, 350);
    assert.equal(writing.source, 'custom');
    assert.deepEqual(writing.invocation, { modelInvocable: true, userInvocable: true });
    assert.deepEqual(writing.resourceBase, { kind: 'directory', path: join(fixture, 'nature-writing') });
    assert.equal(writing.locator.path, join(fixture, 'nature-writing', 'SKILL.md'));
  });

  it('loads the body without frontmatter and keeps the resource base', async () => {
    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    const candidates = await provider.list();
    const writing = candidates.find(candidate => candidate.name === 'nature-writing');
    const definition = await provider.get(writing);
    assert.equal(definition.name, 'nature-writing');
    assert.equal(definition.description, '论文写作、改写与润色');
    assert.equal(definition.whenToUse, '当需要改写或润色论文段落时');
    assert.equal(definition.content.startsWith('# Nature Writing'), true);
    assert.equal(definition.content.includes('description:'), false);
    assert.deepEqual(definition.resourceBase, { kind: 'directory', path: join(fixture, 'nature-writing') });
  });

  it('hides a disabled skill from list and refuses to load it', async () => {
    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    await manager.setSkillEnabled({ sourceId: 'fixture', name: 'nature-writing', enabled: false });
    const candidates = await provider.list();
    assert.equal(candidates.some(candidate => candidate.name === 'nature-writing'), false);
    assert.equal(await provider.get({ name: 'nature-writing', locator: { path: join(fixture, 'nature-writing', 'SKILL.md'), directory: join(fixture, 'nature-writing'), sourceId: 'fixture' } }), undefined);
    await manager.setSkillEnabled({ sourceId: 'fixture', name: 'nature-writing', enabled: true });
    assert.equal((await provider.list()).some(candidate => candidate.name === 'nature-writing'), true);
  });
});

describe('preset sources', () => {
  it('offers the curated research collections alongside the original presets', () => {
    const ids = BUILTIN_PRESET_SOURCES.map(preset => preset.id);
    for (const id of [
      'nature-skills',
      'figures4papers',
      'academic-research-skills',
      'science-superpowers',
      'scientific-writer',
      'bioinformatics-skills',
      'drug-discovery-skills',
      'book-to-skill',
    ]) {
      assert.equal(ids.includes(id), true, id);
    }
    for (const preset of BUILTIN_PRESET_SOURCES) {
      assert.equal(parseGitHubUrl(preset.url).repository.length > 0, true);
    }
  });
});

describe('GitHub source validation', () => {
  it('accepts a repository link and derives the clone address', () => {
    const parsed = parseGitHubUrl('https://github.com/Yuan1z0825/nature-skills');
    assert.equal(parsed.repository, 'Yuan1z0825/nature-skills');
    assert.equal(parsed.cloneUrl, 'https://github.com/Yuan1z0825/nature-skills.git');
  });

  it('rejects credentials, other hosts, and non-HTTPS links', () => {
    for (const url of [
      'https://user:pass@github.com/a/b',
      'http://github.com/a/b',
      'https://gitlab.com/a/b',
      'https://github.com/a',
      'not a url',
    ]) {
      assert.throws(() => parseGitHubUrl(url), SkillError, url);
    }
  });
});

describe('category mapping', () => {
  it('maps a skill by its name and summary', () => {
    assert.equal(categorizeSkill('paper-review', 'referee report'), 'review');
    assert.equal(categorizeSkill('anything', '绘制发表级图表'), 'figure');
    assert.equal(categorizeSkill('misc', 'something else'), 'general');
  });
});

describe('HTTP surface', () => {
  const fakeCtx = {
    get: (name) => (name === 'workspaceRegistry' ? { list: () => [] } : undefined),
  };
  const handler = () => createWorkbenchHandler({ ctx: fakeCtx, manager, token: TOKEN, version: '0.1.0' });

  const post = (body, headers = {}) => handler()(new Request(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }));

  const get = (query) => handler()(new Request(`${API}?${query}`, { method: 'GET' }));

  it('serves bootstrap with the catalog and the boot token', async () => {
    const response = await get('action=bootstrap');
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.token, TOKEN);
    assert.equal(payload.version, '0.1.0');
    assert.equal(payload.skillStatus.skills.length, 3);
    assert.equal(payload.skillStatus.sources[0].id, 'fixture');
    assert.deepEqual(payload.filesByWorkspace, {});
  });

  it('refuses a POST without the boot token', async () => {
    const response = await post({ action: 'toggle-skill', sourceId: 'fixture', name: 'nature-reading', enabled: false });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'INVALID_TOKEN');
  });

  it('refuses a cross-site POST', async () => {
    const response = await post({ action: 'toggle-skill' }, { 'sec-fetch-site': 'cross-site', 'x-workbench-token': TOKEN });
    assert.equal(response.status, 403);
  });

  it('requires a JSON content type', async () => {
    const response = await handler()(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-workbench-token': TOKEN },
      body: 'action=x',
    }));
    assert.equal(response.status, 415);
  });

  it('toggles a skill with a valid token and returns the refreshed catalog', async () => {
    const response = await post({ action: 'toggle-skill', sourceId: 'fixture', name: 'nature-reading', enabled: false }, { 'x-workbench-token': TOKEN });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.disabledSkills, ['fixture/nature-reading']);
    assert.equal(payload.skillStatus.skills.find(row => row.name === 'nature-reading').disabled, true);
    const restore = await post({ action: 'toggle-skill', sourceId: 'fixture', name: 'nature-reading', enabled: true }, { 'x-workbench-token': TOKEN });
    assert.deepEqual((await restore.json()).disabledSkills, []);
  });

  it('answers a 423 when another live process holds the lock', async () => {
    const lockPath = join(root, 'home', 'install.lock');
    await writeFile(lockPath, JSON.stringify({ pid: process.ppid, createdAt: new Date().toISOString() }), 'utf8');
    const other = new SkillSourceManager({ dataRoot: join(root, 'home') });
    const busy = createWorkbenchHandler({ ctx: fakeCtx, manager: other, token: TOKEN, version: '0.1.0' });
    const response = await busy(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workbench-token': TOKEN },
      body: JSON.stringify({ action: 'add-skill-source', url: 'https://github.com/example/example' }),
    }));
    assert.equal(response.status, 423);
    assert.equal((await response.json()).code, 'busy');
    await rm(lockPath, { force: true });
  });

  it('replaces a lock left by a dead process', async () => {
    const lockPath = join(root, 'home', 'install.lock');
    await writeFile(lockPath, JSON.stringify({ pid: 2147483646, createdAt: new Date().toISOString() }), 'utf8');
    const release = await acquireInstallLock(lockPath);
    await release();
    assert.equal(await readFile(lockPath, 'utf8').catch(() => 'gone'), 'gone');
  });

  it('registers and forgets a literature folder without touching its files', async () => {
    const literature = join(root, 'papers');
    const added = await post({ action: 'add-literature-dir', path: literature }, { 'x-workbench-token': TOKEN });
    assert.equal(added.status, 200);
    const payload = await added.json();
    assert.deepEqual(payload.literatureDirs, [literature]);
    assert.equal(payload.literatureFiles[literature].length, 1);
    const removed = await post({ action: 'remove-literature-dir', path: literature }, { 'x-workbench-token': TOKEN });
    assert.deepEqual((await removed.json()).literatureDirs, []);
    assert.equal((await readFile(join(literature, 'one.pdf'), 'utf8')), 'pdf');
  });

  it('serves one skill document with its shared dependency report', async () => {
    const response = await get(`action=skill-detail&sourceId=fixture&skillName=nature-writing`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.content.includes('# Nature Writing'), true);
    assert.equal(payload.sharedDeps.some(dep => dep.name === 'nature-shared' && dep.exists === true), true);
    assert.equal(payload.siblings.some(entry => entry.name === 'SKILL.md'), true);
  });

  it('registers a project folder through the workspace registry', async () => {
    const created = [];
    const registry = {
      resolveByPath: async () => undefined,
      create: async (path, title) => {
        created.push({ path, title });
        return { id: 'ws-1', path, title, sessionIds: ['s-1'] };
      },
    };
    const handlerWithRegistry = createWorkbenchHandler({
      ctx: { get: name => (name === 'workspaceRegistry' ? registry : undefined) },
      manager,
      token: TOKEN,
      version: '0.1.0',
    });
    const response = await handlerWithRegistry(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workbench-token': TOKEN },
      body: JSON.stringify({ action: 'add-workspace', path: fixture, title: 'Fixture' }),
    }));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(created, [{ path: fixture, title: 'Fixture' }]);
    assert.deepEqual(payload.workspace, { id: 'ws-1', path: fixture, title: 'Fixture', sessionIds: ['s-1'] });
  });

  it('opens a native path through the session controller', async () => {
    const opened = [];
    const controller = {
      openWorkspacePath: async (request, signal) => {
        opened.push({ path: request.path, action: request.action, aborted: signal.aborted });
        return { opened: true };
      },
    };
    const handlerWithController = createWorkbenchHandler({
      ctx: { get: name => (name === 'sessionController' ? controller : undefined) },
      manager,
      token: TOKEN,
      version: '0.1.0',
    });
    const target = join(root, 'papers', 'one.pdf');
    const response = await handlerWithController(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workbench-token': TOKEN },
      body: JSON.stringify({ action: 'open-native-path', path: target, mode: 'reveal' }),
    }));
    assert.equal(response.status, 200);
    assert.equal(opened.length, 1);
    assert.equal(opened[0].path, target);
    assert.equal(opened[0].action, 'reveal');
    assert.equal(opened[0].aborted, false);
  });

  it('refuses to open a path that does not exist', async () => {
    const response = await post({ action: 'open-native-path', path: join(root, 'ghost.pdf') }, { 'x-workbench-token': TOKEN });
    assert.equal(response.status, 400);
  });
});

describe('category precedence', () => {
  it('prefers the skill name over incidental words in the summary', () => {
    assert.equal(categorizeSkill('nature-reader', 'creates readers with figures and tables'), 'reading');
    assert.equal(categorizeSkill('nature-figure', 'draw panels'), 'figure');
    assert.equal(categorizeSkill('nature-polishing', 'polish English'), 'writing');
  });
});

describe('project creation', () => {
  const projectsRoot = () => join(root, 'projects');
  const projectHandler = (registry) => {
    const workspaces = registry ?? {
      resolveByPath: async () => undefined,
      create: async (path, title) => ({ id: `ws-${title}`, path, title, sessionIds: [] }),
    };
    return createWorkbenchHandler({
      ctx: { get: (name) => (name === 'workspaceRegistry' ? workspaces : undefined) },
      manager,
      token: TOKEN,
      version: '0.1.0',
    });
  };
  const create = (handler, body, headers = { 'x-workbench-token': TOKEN }) => handler(new Request(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }));

  it('creates and registers one real subfolder of an existing parent', async () => {
    await mkdir(projectsRoot(), { recursive: true });
    const created = [];
    const handler = projectHandler({
      resolveByPath: async () => undefined,
      create: async (path, title) => {
        created.push({ path, title });
        return { id: 'ws-new', path, title, sessionIds: [] };
      },
    });
    const response = await create(handler, { action: 'create-workspace', parentPath: projectsRoot(), name: 'Project A' });
    assert.equal(response.status, 200);
    const payload = await response.json();
    const expectedPath = join(projectsRoot(), 'Project A');
    assert.deepEqual(created, [{ path: expectedPath, title: 'Project A' }]);
    assert.deepEqual(payload.workspace, { id: 'ws-new', path: expectedPath, title: 'Project A', sessionIds: [] });
    assert.equal((await stat(expectedPath)).isDirectory(), true);
  });

  it('refuses an existing folder, a path in the name, a missing parent, and a file parent', async () => {
    await mkdir(join(projectsRoot(), 'Taken'), { recursive: true });
    const handler = projectHandler();

    const duplicate = await create(handler, { action: 'create-workspace', parentPath: projectsRoot(), name: 'Taken' });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).code, 'duplicate');

    for (const name of ['../escape', 'a/b', '..', '.', '', 'con']) {
      const refused = await create(handler, { action: 'create-workspace', parentPath: projectsRoot(), name });
      assert.equal(refused.status, 400, `name ${JSON.stringify(name)} must be refused`);
      assert.equal((await refused.json()).code, 'invalid_name');
    }
    assert.equal(await readdir(projectsRoot()).then(rows => rows.includes('escape')), false);

    const missing = await create(handler, { action: 'create-workspace', parentPath: join(root, 'ghost-parent'), name: 'X' });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).code, 'invalid_directory');

    const relative = await create(handler, { action: 'create-workspace', parentPath: 'relative/dir', name: 'X' });
    assert.equal(relative.status, 400);

    const fileParent = await create(handler, { action: 'create-workspace', parentPath: join(root, 'papers', 'one.pdf'), name: 'X' });
    assert.equal(fileParent.status, 400);
    assert.equal((await fileParent.json()).code, 'invalid_directory');

    const noToken = await create(handler, { action: 'create-workspace', parentPath: projectsRoot(), name: 'NoToken' }, {});
    assert.equal(noToken.status, 403);
    assert.equal(await readdir(projectsRoot()).then(rows => rows.includes('NoToken')), false);
  });

  it('keeps the folder when registration fails, and registers it as an existing folder', async () => {
    const failing = projectHandler({
      resolveByPath: async () => undefined,
      create: async () => {
        throw new Error('registry offline');
      },
    });
    const response = await create(failing, { action: 'create-workspace', parentPath: projectsRoot(), name: 'Kept' });
    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload.code, 'register_failed');
    assert.equal(payload.error.includes(join(projectsRoot(), 'Kept')), true);
    const kept = join(projectsRoot(), 'Kept');
    assert.equal((await stat(kept)).isDirectory(), true);

    const registering = projectHandler({
      resolveByPath: async (path) => ({ id: 'ws-kept', path, title: 'Kept', sessionIds: [] }),
      create: async () => {
        throw new Error('must not create');
      },
    });
    const added = await create(registering, { action: 'add-workspace', path: kept });
    assert.equal(added.status, 200);
    assert.equal((await added.json()).workspace.id, 'ws-kept');
  });

  it('reports which project folders still exist, and null without a registry', async () => {
    const existing = join(projectsRoot(), 'Taken');
    const gone = join(projectsRoot(), 'Gone');
    const withRegistry = projectHandler({
      list: () => [{ id: 'ws-here', path: existing, title: 'Here', sessionIds: [] }, { id: 'ws-gone', path: gone, title: 'Gone', sessionIds: [] }],
    });
    const payload = await (await withRegistry(new Request(`${API}?action=bootstrap`, { method: 'GET' }))).json();
    assert.deepEqual(payload.workspaceAvailability, { 'ws-here': true, 'ws-gone': false });

    const withoutRegistry = createWorkbenchHandler({
      ctx: { get: () => undefined },
      manager,
      token: TOKEN,
      version: '0.1.0',
    });
    const bare = await (await withoutRegistry(new Request(`${API}?action=bootstrap`, { method: 'GET' }))).json();
    assert.equal(bare.workspaceAvailability, null);
  });
});

describe('shared skill versions', () => {
  const roleSkills = [{ sourceId: 'fixture', name: 'nature-writing' }];
  const roleStore = {
    hasAny: async () => true,
    resolveSession: async () => ({ status: 'role', via: 'role', botId: 'bot-shared', templateId: 'fixture', skills: roleSkills }),
  };
  const agent = { id: 'session-shared', session: { id: 'session-shared' } };
  const post = (body, headers = { 'x-workbench-token': TOKEN }) => createWorkbenchHandler({
    ctx: { get: () => undefined },
    manager,
    token: TOKEN,
    version: '0.1.0',
  })(new Request(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }));

  const EDITED = `---
name: nature-writing
description: 编辑后的论文写作说明
whenToUse: 需要共享版本时
---
# Shared Writing

Use the shared instructions.
`;

  const upstreamPath = () => join(fixture, 'nature-writing', 'SKILL.md');

  it('saves one shared version that the catalog, the dialog, and the provider all use', async () => {
    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    assert.equal(detail.customized, false);
    assert.equal(detail.expectedHash.length, 64);
    const response = await post({
      action: 'save-skill-override',
      sourceId: 'fixture',
      name: 'nature-writing',
      content: EDITED,
      expectedHash: detail.expectedHash,
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.detail.customized, true);
    assert.equal(payload.detail.content, EDITED);
    assert.equal(payload.detail.upstreamContent, WRITING_SKILL);
    assert.equal(payload.skillStatus.skills.find(row => row.name === 'nature-writing').description, '编辑后的论文写作说明');

    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    const candidate = (await provider.list()).find(item => item.name === 'nature-writing');
    const definition = await provider.get(candidate);
    assert.equal(definition.content, '# Shared Writing\n\nUse the shared instructions.');
    assert.equal(definition.description, '编辑后的论文写作说明');
    assert.equal(definition.path, undefined);
    assert.deepEqual(definition.resourceBase, { kind: 'directory', path: join(fixture, 'nature-writing') });

    // The repository tree is never rewritten.
    assert.equal(await readFile(upstreamPath(), 'utf8'), WRITING_SKILL);
  });

  it('refuses a stale editor state and keeps the saved text', async () => {
    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    const stale = await post({
      action: 'save-skill-override',
      sourceId: 'fixture',
      name: 'nature-writing',
      content: EDITED.replace('Shared', 'Other'),
      expectedHash: 'a'.repeat(64),
    });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, 'conflict');
    const after = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    assert.equal(after.content, EDITED);
    assert.equal(detail.expectedHash, after.expectedHash);
  });

  it('rejects a document that would break the catalog', async () => {
    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    for (const content of [
      '# no frontmatter\n',
      EDITED.replace('name: nature-writing', 'name: another-name'),
      EDITED.replace('description: 编辑后的论文写作说明', 'description: ""'),
      `${EDITED}\n${'x'.repeat(300 * 1024)}\n`,
    ]) {
      const response = await post({
        action: 'save-skill-override',
        sourceId: 'fixture',
        name: 'nature-writing',
        content,
        expectedHash: detail.expectedHash,
      });
      assert.equal(response.status >= 400, true);
      assert.notEqual(response.status, 500);
    }
    const after = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    assert.equal(after.content, EDITED);
  });

  it('keeps the customization through an upstream update and restores the new upstream text', async () => {
    const updated = `${WRITING_SKILL}\nNew upstream section.\n`;
    await writeFileAt(upstreamPath(), updated);
    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    assert.equal(detail.upstreamChanged, true);
    assert.equal(detail.upstreamContent, updated);
    assert.equal(detail.content, EDITED);

    const reset = await post({
      action: 'reset-skill-override',
      sourceId: 'fixture',
      name: 'nature-writing',
      expectedHash: detail.expectedHash,
    });
    assert.equal(reset.status, 200);
    const payload = await reset.json();
    assert.equal(payload.detail.customized, false);
    assert.equal(payload.detail.content, updated);
    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    const definition = await provider.get((await provider.list())[0]);
    assert.equal(definition.content.includes('New upstream section.'), true);
    assert.equal(definition.path, upstreamPath());
    await writeFileAt(upstreamPath(), WRITING_SKILL);
  });

  it('keeps a broken customization out of the assistants and restores it on request', async () => {
    const file = manager.overridePath('fixture', 'nature-writing');
    await writeFileAt(file, '{ not json');
    const rows = await manager.scanSkills({ fresh: true });
    const row = rows.find(item => item.name === 'nature-writing');
    assert.equal(typeof row.overrideError, 'string');
    const provider = createSkillProvider(manager, { warn() {} }, agent, roleStore);
    assert.equal(await provider.get({ name: 'nature-writing', locator: { sourceId: 'fixture', path: row.skillFilePath } }), undefined);

    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-writing' });
    assert.equal(typeof detail.overrideError, 'string');
    const save = await post({
      action: 'save-skill-override',
      sourceId: 'fixture',
      name: 'nature-writing',
      content: EDITED,
      expectedHash: detail.expectedHash,
    });
    assert.equal(save.status, 409);
    const reset = await post({
      action: 'reset-skill-override',
      sourceId: 'fixture',
      name: 'nature-writing',
      expectedHash: detail.expectedHash,
    });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).detail.overrideError, undefined);
    await assert.rejects(readFile(file, 'utf8'), { code: 'ENOENT' });
  });

  it('keeps customizations when their source is removed and re-attaches them on re-add', async () => {
    const detail = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-reading' });
    const response = await post({
      action: 'save-skill-override',
      sourceId: 'fixture',
      name: 'nature-reading',
      content: READING_SKILL.replace('论文精读与要点提取', '共享的精读说明'),
      expectedHash: detail.expectedHash,
    });
    assert.equal(response.status, 200);
    const before = await readFile(manager.overridePath('fixture', 'nature-reading'), 'utf8');
    await manager.removeSource('fixture');
    assert.equal(await readFile(manager.overridePath('fixture', 'nature-reading'), 'utf8'), before);
    await manager.addLocalSource({ path: fixture, title: 'Fixture skills', id: 'fixture' });
    const restored = await manager.skillDetail({ sourceId: 'fixture', name: 'nature-reading' });
    assert.equal(restored.customized, true);
    assert.equal(restored.description, '共享的精读说明');
    await manager.resetSkillOverride({ sourceId: 'fixture', name: 'nature-reading', expectedHash: restored.expectedHash });
  });

  it('answers 423 for this process own live lock and keeps an unreadable lock', async () => {
    const lockPath = join(root, 'home', 'install.lock');
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), 'utf8');
    const response = await post({ action: 'save-skill-override', sourceId: 'fixture', name: 'nature-writing', content: EDITED, expectedHash: 'x' });
    assert.equal(response.status, 423);
    await rm(lockPath, { force: true });

    await writeFile(lockPath, '', 'utf8');
    const blank = await post({ action: 'save-skill-override', sourceId: 'fixture', name: 'nature-writing', content: EDITED, expectedHash: 'x' });
    assert.equal(blank.status, 423);
    assert.equal((await blank.json()).error.includes(lockPath), true);
    assert.equal(await readFile(lockPath, 'utf8'), '');
    await rm(lockPath, { force: true });
  });
});

describe('repository identity', () => {
  it('reads preset installation from the repository, not from a reused id', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-rw-repo-'));
    try {
      const dataRoot = join(home, 'workbench');
      await mkdir(join(dataRoot, 'sources', 'scientific-agent-skills'), { recursive: true });
      await writeFile(join(dataRoot, 'state.json'), JSON.stringify({
        version: 1,
        sources: [{
          id: 'scientific-agent-skills',
          title: 'Something else',
          kind: 'github',
          repository: 'example/other-repo',
          branch: 'main',
          syncMode: 'tarball',
          installedRevision: 'b'.repeat(40),
        }],
        disabledSkills: [],
        literatureDirs: [],
        pinnedProjects: [],
      }), 'utf8');
      const isolated = new SkillSourceManager({ dataRoot });
      let presets = (await isolated.status()).presets;
      assert.equal(presets.find(preset => preset.id === 'scientific-agent-skills').installed, false);

      const state = await isolated.load();
      assert.equal(await isolated.freeSourceId(state, 'scientific-agent-skills'), 'scientific-agent-skills-official');
      state.sources.push({
        id: 'academic-research-skills-official',
        title: 'Academic Research Skills',
        kind: 'github',
        repository: 'Imbad0202/academic-research-skills',
        branch: 'main',
        syncMode: 'tarball',
        installedRevision: 'c'.repeat(40),
      });
      await isolated.save(state);
      presets = (await isolated.status()).presets;
      assert.equal(presets.find(preset => preset.id === 'academic-research-skills').installed, true);
      assert.equal(presets.find(preset => preset.id === 'science-superpowers').installed, false);
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });

  it('prepends the repository-root path map only for Academic Research Skills', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-rw-academic-'));
    try {
      const dataRoot = join(home, 'workbench');
      const skillDir = join(dataRoot, 'sources', 'academic-research-skills', 'deep-research');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), `---
name: deep-research
description: 深度研究流水线
---
# Deep Research

Read shared/references/routing_core.md first.
`, 'utf8');
      await writeFile(join(dataRoot, 'state.json'), JSON.stringify({
        version: 1,
        sources: [{
          id: 'academic-research-skills',
          title: 'Academic Research Skills',
          kind: 'github',
          repository: 'Imbad0202/academic-research-skills',
          branch: 'main',
          syncMode: 'tarball',
          installedRevision: 'd'.repeat(40),
        }],
        disabledSkills: [],
        literatureDirs: [],
        pinnedProjects: [],
      }), 'utf8');
      const isolated = new SkillSourceManager({ dataRoot });
      const status = await isolated.status();
      const row = status.skills.find(item => item.name === 'deep-research');
      assert.equal(row.canonicalSourceId, 'academic-research-skills');
      const provider = createSkillProvider(isolated, { warn() {} }, { session: { id: 's' } }, {
        hasAny: async () => true,
        resolveSession: async () => ({ status: 'role', skills: [{ sourceId: 'academic-research-skills', name: 'deep-research' }] }),
      });
      const definition = await provider.get((await provider.list())[0]);
      assert.equal(definition.content.startsWith('本技能来自 Academic Research Skills'), true);
      assert.equal(definition.content.includes(join(dataRoot, 'sources', 'academic-research-skills')), true);
      assert.equal(definition.content.includes('# Deep Research'), true);
      assert.deepEqual(definition.resourceBase, { kind: 'directory', path: skillDir });
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});

describe('skill guides', () => {
  it('follows the canonical repository id and flags a moved upstream text', async () => {
    const guides = await loadSkillGuides();
    const row = {
      sourceId: 'science-superpowers-official',
      canonicalSourceId: 'science-superpowers',
      name: 'framing-research-questions',
      sourceHash: '0'.repeat(64),
    };
    const guide = guideFor(guides, row);
    assert.equal(Array.isArray(guide.zh), true);
    assert.equal(guide.zh.length, 3);
    assert.equal(Array.isArray(guide.en), true);
    assert.equal(guide.stale, true);
    assert.equal(guideFor(guides, { ...row, sourceHash: undefined }).stale, false);
  });

  it('answers nothing for a skill nobody curated instead of inventing one', async () => {
    const guides = await loadSkillGuides();
    assert.equal(guideFor(guides, { sourceId: 'local-source', canonicalSourceId: 'local-source', name: 'uncurated-skill', sourceHash: 'f'.repeat(64) }), undefined);
  });

  it('ships every bundled research skill with both locales', async () => {
    const guides = await loadSkillGuides();
    for (const [key, guide] of guides) {
      assert.equal(guide.zh.length, 3, key);
      assert.equal(guide.en.length, 3, key);
      assert.equal(guide.zh.every(text => text.trim() !== ''), true, key);
      assert.equal(guide.en.every(text => text.trim() !== ''), true, key);
    }
  });
});
