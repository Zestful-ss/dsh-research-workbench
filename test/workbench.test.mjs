/**
 * Behavior tests for the research workbench's host half: upstream source
 * scanning (shared sibling libraries included), the `ctx.skills` provider
 * contract, and the HTTP surface's authorization fence.
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { SkillSourceManager, categorizeSkill, parseFrontmatter, referencedSiblings } from '../lib/skill-manager.js';
import { SkillError, acquireInstallLock, parseGitHubUrl } from '../lib/skill-sources.js';
import { createWorkbenchHandler } from '../lib/workbench-api.js';
import { createSkillProvider } from '../lib/index.js';

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
