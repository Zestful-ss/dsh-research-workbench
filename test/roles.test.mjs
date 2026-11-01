/**
 * Behavior tests for the research role slice: DS-Bot state indexing, pending
 * transaction recovery, per-Agent skill isolation (own chat, earlier segments,
 * group sessions), conflicts, disable/remove/restart invalidation, the role
 * file's failure modes, and the role HTTP actions.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { createSkillProvider } from '../lib/index.js';
import { SkillSourceManager } from '../lib/skill-manager.js';
import { SkillError, writeJsonAtomic } from '../lib/skill-sources.js';
import { ROLE_TEMPLATES, ResearchRoleStore, evaluateSelection, readRoleFile } from '../lib/research-roles.js';
import { indexDsBotSessions, markerOf, roleMarker } from '../lib/ds-bot.js';
import { createWorkbenchHandler } from '../lib/workbench-api.js';

const TOKEN = 'role-token';
const API = 'http://127.0.0.1/api/dsh-research-workbench';

let root;
let profileDir;
let botHome;
let dataRoot;
let manager;

async function put(path, text) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, text, 'utf8');
}

function skill(name, description) {
  return `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n\nSee ../shared-lib/core.md.\n`;
}

function stateFile() {
  return join(botHome, 'state.json');
}

async function writeTeam(bots, rooms = {}) {
  await writeJsonAtomic(stateFile(), { version: 1, bots, rooms });
}

async function readTeam() {
  return JSON.parse(await readFile(stateFile(), 'utf8'));
}

function adapterCtx() {
  return {
    get(name) {
      return name === 'profileContext' ? { dir: profileDir } : undefined;
    },
    loader: {
      entries: () => [{ options: { name: 'ds-bot', id: 'bot' }, disabled: false, fiber: { config: { home: botHome } } }],
    },
  };
}

function makeStore() {
  return new ResearchRoleStore({
    dataRoot,
    manager,
    log: { warn() {} },
    ctx: adapterCtx(),
  });
}

async function registerBotMarker(botId, transactionId) {
  const team = await readTeam();
  team.bots[botId].instructions = `研究助手\n${roleMarker(transactionId)}`;
  await writeJsonAtomic(stateFile(), team);
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-rw-roles-'));
  profileDir = join(root, 'profile');
  botHome = join(root, 'bot');
  dataRoot = join(root, 'workbench');
  await put(join(profileDir, 'node_modules', 'ds-bot', 'package.json'), JSON.stringify({ name: 'ds-bot', version: '0.2.3' }));
  await put(join(botHome, 'state.json'), JSON.stringify({ version: 1, bots: {}, rooms: {} }));

  // A shared sibling makes the provider's directory resource base observable.
  await put(join(root, 'skills-a', 'shared-lib', 'core.md'), '# core\n');
  await put(join(root, 'skills-a', 'nature-writing', 'SKILL.md'), skill('nature-writing', '论文写作'));
  await put(join(root, 'skills-a', 'nature-paper-xray', 'SKILL.md'), skill('nature-paper-xray', '论文精读'));
  await put(join(root, 'skills-a', 'old-skill', 'SKILL.md'), skill('old-skill', '将被上游移除'));

  await put(join(root, 'skills-b', 'nature-data', 'SKILL.md'), skill('nature-data', '数据可用性'));
  await put(join(root, 'skills-c', 'nature-writing', 'SKILL.md'), skill('nature-writing', '另一个来源的同名技能'));
  await put(join(root, 'skills-d', 'one', 'SKILL.md'), skill('dual-skill', '同一来源第一处'));
  await put(join(root, 'skills-d', 'two', 'SKILL.md'), skill('dual-skill', '同一来源第二处'));

  manager = new SkillSourceManager({ dataRoot, log: { warn() {} } });
  await manager.addLocalSource({ path: join(root, 'skills-a'), title: 'Source A', id: 'source-a' });
  await manager.addLocalSource({ path: join(root, 'skills-b'), title: 'Source B', id: 'source-b' });
});

after(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
});

describe('DS-Bot indexing', () => {
  it('maps current chats, earlier segments, group sessions, and markers', async () => {
    const transactionId = randomUUID();
    const indexed = indexDsBotSessions({
      bots: {
        'bot-a': {
          id: 'bot-a',
          name: 'A',
          sessionId: 'bot-a-current',
          instructions: `x ${roleMarker(transactionId)}`,
          segments: [{ sessionId: 'bot-a-old' }],
        },
      },
      rooms: {
        'room-1': {
          sessions: { 'bot-a': 'room-current' },
          segments: { 'bot-a': [{ sessionId: 'room-old' }] },
        },
      },
    });
    assert.equal(indexed.sessionToBot.get('bot-a-current'), 'bot-a');
    assert.equal(indexed.sessionToBot.get('bot-a-old'), 'bot-a');
    assert.equal(indexed.sessionToBot.get('bot-a'), 'bot-a');
    assert.equal(indexed.sessionToBot.get('room-current'), 'bot-a');
    assert.equal(indexed.sessionToBot.get('room-old'), 'bot-a');
    assert.equal(markerOf(`x ${roleMarker(transactionId)}`), transactionId);
    assert.deepEqual(indexed.markers.get(transactionId), ['bot-a']);
  });
});

describe('DS-Bot state compatibility', () => {
  async function fixture(name) {
    const base = join(root, 'ds-bot-compatibility', name);
    const profile = join(base, 'profile');
    const home = join(base, 'bot');
    const roleHome = join(base, 'workbench');
    const packageFile = join(profile, 'node_modules', 'ds-bot', 'package.json');
    const stateFile = join(home, 'state.json');
    const selectedSkills = [{ sourceId: 'source-a', name: 'nature-writing' }];
    const state = {
      version: 1,
      bots: { writer: { id: 'writer', name: 'Writer', sessionId: 'chat-current', segments: [{ sessionId: 'chat-old' }] } },
      rooms: { group: { sessions: { writer: 'group-current' }, segments: { writer: [{ sessionId: 'group-old' }] } } },
      privateArchives: [],
      futureMetadata: { extraFieldsAreAllowed: true },
    };
    await put(packageFile, JSON.stringify({ name: 'ds-bot', version: '0.2.4' }));
    await put(stateFile, JSON.stringify(state));
    await put(join(roleHome, 'roles.json'), JSON.stringify({
      version: 2,
      pending: {},
      roles: { writer: { templateId: 'paper-writing', workspaceId: 'project-a', skills: selectedSkills } },
    }));
    const ctx = {
      get: name => name === 'profileContext' ? { dir: profile } : undefined,
      loader: { entries: () => [{ options: { name: 'ds-bot' }, fiber: { config: { home } } }] },
    };
    return { store: new ResearchRoleStore({ dataRoot: roleHome, manager, ctx }), packageFile, stateFile, state, selectedSkills };
  }

  it('keeps roles and session ownership for later DS-Bot versions with the same state format', async () => {
    const { store, packageFile, selectedSkills } = await fixture('future-versions');
    for (const version of ['0.2.3', '0.2.4', '0.2.5', '0.9.0', '1.0.0']) {
      await put(packageFile, JSON.stringify({ name: 'ds-bot', version }));
      const view = await store.view();
      assert.equal(view.compatible, true, version);
      assert.equal(view.dsBot.version, version);
      assert.equal(view.entries[0].name, 'Writer');
      assert.equal(view.entries[0].workspaceId, 'project-a');
      for (const sessionId of ['chat-current', 'chat-old', 'group-current', 'group-old']) {
        const resolved = await store.resolveSession(sessionId);
        assert.equal(resolved.botId, 'writer', `${version}: ${sessionId}`);
        assert.deepEqual(resolved.skills, selectedSkills);
      }
    }
  });

  it('preserves roles and reports incompatible state and session ownership formats', async () => {
    const { store, packageFile, stateFile, state } = await fixture('incompatible-state');
    await put(packageFile, JSON.stringify({ name: 'ds-bot', version: '1.0.0' }));
    const incompatibleStates = [
      { state: { ...state, version: 2 }, reason: 'state-version' },
      { state: { ...state, bots: [] }, reason: 'state' },
      { state: { ...state, bots: { writer: { ...state.bots.writer, segments: {} } } }, reason: 'state' },
      { state: { ...state, rooms: { group: { sessions: [] } } }, reason: 'state' },
      { state: { ...state, rooms: { group: { segments: { writer: {} } } } }, reason: 'state' },
    ];
    for (const entry of incompatibleStates) {
      await put(stateFile, JSON.stringify(entry.state));
      const view = await store.view();
      assert.equal(view.compatible, false);
      assert.equal(view.reason, entry.reason);
      assert.match(view.error, /DS-Bot/);
      assert.equal(view.entries[0].workspaceId, 'project-a');
      assert.equal((await store.resolveSession('group-current')).status, 'unavailable');
    }
  });
});

describe('role transactions', () => {
  it('prepares, completes with the Bot marker, and views the role', async () => {
    await writeTeam({
      'bot-a': { id: 'bot-a', name: 'Writer', model: 'rw-test/model-a', sessionId: 'bot-a' },
      'bot-b': { id: 'bot-b', name: 'Reader', model: 'rw-test/model-b', sessionId: 'bot-b' },
      'bot-plain': { id: 'bot-plain', name: 'Plain', sessionId: 'bot-plain' },
    });
    const store = makeStore();
    const prepared = await store.prepare({
      templateId: 'paper-writing',
      name: 'Writer',
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
    });
    assert.equal(typeof prepared.transactionId, 'string');
    await assert.rejects(
      () => store.complete({ transactionId: prepared.transactionId, botId: 'bot-a' }),
      error => error instanceof SkillError && error.code === 'invalid',
    );
    await registerBotMarker('bot-a', prepared.transactionId);
    const completed = await store.complete({ transactionId: prepared.transactionId, botId: 'bot-a' });
    assert.equal(completed.botId, 'bot-a');

    const preparedB = await store.prepare({
      templateId: 'literature-search',
      name: 'Reader',
      skills: [{ sourceId: 'source-a', name: 'nature-paper-xray' }],
    });
    await registerBotMarker('bot-b', preparedB.transactionId);
    await store.complete({ transactionId: preparedB.transactionId, botId: 'bot-b' });

    const view = await store.view();
    assert.equal(view.compatible, true);
    assert.equal(view.entries.length, 2);
    const writer = view.entries.find(entry => entry.botId === 'bot-a');
    assert.equal(writer.name, 'Writer');
    assert.equal(writer.model, 'rw-test/model-a');
    assert.equal(writer.skills[0].key, 'source-a/nature-writing');
    assert.equal(writer.skills[0].available, true);
    assert.deepEqual(view.pending, []);
  });

  it('rejects an unknown template and an unknown skill key', async () => {
    const store = makeStore();
    await assert.rejects(() => store.prepare({ templateId: 'nope', name: 'X', skills: [] }), SkillError);
    await assert.rejects(
      () => store.prepare({ templateId: 'paper-writing', name: 'X', skills: [{ sourceId: 'source-a', name: 'ghost-skill' }] }),
      error => error instanceof SkillError && error.code === 'invalid',
    );
  });
});

describe('template coverage', () => {
  const natureSkills = [
    'nature-academic-search',
    'nature-citation',
    'nature-data',
    'nature-downloader',
    'nature-experiment-log',
    'nature-figure',
    'nature-image2ppt',
    'nature-literature-pipeline',
    'nature-paper-card',
    'nature-paper-to-patent',
    'nature-paper-trans',
    'nature-paper-xray',
    'nature-paper2ppt',
    'nature-paper2word',
    'nature-polishing',
    'researchwrite',
    'nature-reader',
    'nature-ref-verifier',
    'nature-response',
    'nature-reviewer',
    'nature-social-science',
    'nature-statistics',
    'nature-writing',
  ];

  it('ships six templates that cover every nature-skills entry', () => {
    assert.equal(ROLE_TEMPLATES.length, 6);
    const covered = new Set(ROLE_TEMPLATES
      .flatMap(template => template.skills)
      .filter(skill => skill.sourceId === 'nature-skills')
      .map(skill => skill.name));
    assert.deepEqual([...covered].sort(), natureSkills.slice().sort());
  });

  it('routes a retired template id to its consolidated successor', async () => {
    const legacyFile = join(root, 'roles-legacy.json');
    await writeJsonAtomic(legacyFile, {
      version: 1,
      pending: {},
      roles: {
        'bot-legacy': {
          templateId: 'translation-polish',
          skills: [{ sourceId: 'nature-skills', name: 'nature-polishing' }],
        },
      },
    });
    const legacy = await readRoleFile(legacyFile);
    assert.equal(legacy.roles['bot-legacy'].templateId, 'paper-writing');
  });

  it('preserves existing reading and presentation roles and unfinished selections', async () => {
    const legacyFile = join(root, 'roles-reading-legacy.json');
    const transactionId = randomUUID();
    const readingSkills = [{ sourceId: 'nature-skills', name: 'nature-paper-xray' }];
    const presentationSkills = [{ sourceId: 'nature-skills', name: 'nature-paper2ppt' }];
    await writeJsonAtomic(legacyFile, {
      version: 1,
      pending: { [transactionId]: { templateId: 'paper-reading', name: 'Reader', skills: readingSkills } },
      roles: {
        reader: { templateId: 'paper-reading', skills: readingSkills },
        presenter: { templateId: 'paper-presentation', skills: presentationSkills },
      },
    });
    const state = await readRoleFile(legacyFile);
    assert.equal(state.pending[transactionId].templateId, 'literature-search');
    assert.deepEqual(state.pending[transactionId].skills, readingSkills);
    assert.equal(state.roles.reader.templateId, 'literature-search');
    assert.deepEqual(state.roles.reader.skills, readingSkills);
    assert.equal(state.roles.presenter.templateId, 'research-figure');
    assert.deepEqual(state.roles.presenter.skills, presentationSkills);
  });
});

describe('per-Agent skill isolation', () => {
  it('gives each research Bot only its own skills, in every DS-Bot Session', async () => {
    const team = await readTeam();
    team.bots['bot-a'].segments = [{ sessionId: 'bot-a-old' }];
    team.rooms = {
      'room-1': {
        members: ['bot-a'],
        sessions: { 'bot-a': 'room-current' },
        segments: { 'bot-a': [{ sessionId: 'room-old' }] },
      },
    };
    await writeJsonAtomic(stateFile(), team);

    const store = makeStore();
    const provider = (sessionId) => createSkillProvider(manager, { warn() {} }, { session: { id: sessionId } }, store);
    const names = async (sessionId) => (await provider(sessionId).list()).map(row => row.name).sort();

    assert.deepEqual(await names('bot-a'), ['nature-writing']);
    assert.deepEqual(await names('bot-a-old'), ['nature-writing']);
    assert.deepEqual(await names('room-current'), ['nature-writing']);
    assert.deepEqual(await names('room-old'), ['nature-writing']);
    assert.deepEqual(await names('bot-b'), ['nature-paper-xray']);
    assert.deepEqual(await names('agent-plain'), []);
    assert.deepEqual(await names('bot-plain'), []);
  });

  it('publishes a pending transaction to the Bot carrying its marker', async () => {
    const team = await readTeam();
    team.bots['bot-pending'] = { id: 'bot-pending', name: 'Pending', sessionId: 'bot-pending' };
    await writeJsonAtomic(stateFile(), team);
    const store = makeStore();
    const prepared = await store.prepare({
      templateId: 'peer-review',
      name: 'Pending',
      skills: [{ sourceId: 'source-b', name: 'nature-data' }],
    });
    await registerBotMarker('bot-pending', prepared.transactionId);
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-pending' } }, store);
    assert.deepEqual((await provider.list()).map(row => row.name), ['nature-data']);
  });

  it('loads the body with the skill directory as resource base', async () => {
    const store = makeStore();
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-a' } }, store);
    const candidate = (await provider.list())[0];
    const definition = await provider.get(candidate);
    assert.equal(definition.name, 'nature-writing');
    assert.equal(definition.content.startsWith('# nature-writing'), true);
    assert.deepEqual(definition.resourceBase, { kind: 'directory', path: join(root, 'skills-a', 'nature-writing') });
    assert.equal(definition.path, join(root, 'skills-a', 'nature-writing', 'SKILL.md'));
  });
});

describe('selection failures and invalidation', () => {
  it('drops a cross-source name conflict instead of picking a winner', async () => {
    await manager.addLocalSource({ path: join(root, 'skills-c'), title: 'Source C', id: 'source-c' });
    const store = makeStore();
    await store.setSkills({
      botId: 'bot-a',
      skills: [
        { sourceId: 'source-a', name: 'nature-writing' },
        { sourceId: 'source-c', name: 'nature-writing' },
        { sourceId: 'source-a', name: 'old-skill' },
      ],
    });
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-a' } }, store);
    assert.deepEqual((await provider.list()).map(row => row.name), ['old-skill']);
    const view = await store.view();
    const writer = view.entries.find(entry => entry.botId === 'bot-a');
    const conflicted = writer.skills.filter(entry => entry.name === 'nature-writing');
    assert.equal(conflicted.length, 2);
    assert.equal(conflicted.every(entry => entry.available === false && entry.conflict === true), true);
    assert.equal(writer.conflicts.some(conflict => conflict.kind === 'cross-source'), true);
    await store.setSkills({ botId: 'bot-a', skills: [{ sourceId: 'source-a', name: 'nature-writing' }] });
    await manager.removeSource('source-c');
  });

  it('reports two same-name paths in one source as a duplicate conflict', async () => {
    await manager.addLocalSource({ path: join(root, 'skills-d'), title: 'Source D', id: 'source-d' });
    const store = makeStore();
    await store.setSkills({ botId: 'bot-b', skills: [{ sourceId: 'source-d', name: 'dual-skill' }] });
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-b' } }, store);
    assert.deepEqual(await provider.list(), []);
    const view = await store.view();
    const reader = view.entries.find(entry => entry.botId === 'bot-b');
    assert.equal(reader.skills[0].reason, 'duplicate');
    assert.equal(reader.conflicts.some(conflict => conflict.kind === 'duplicate-path'), true);
    await store.setSkills({ botId: 'bot-b', skills: [{ sourceId: 'source-a', name: 'nature-paper-xray' }] });
    await manager.removeSource('source-d');
  });

  it('removes a disabled skill from the catalog but keeps the selection', async () => {
    const store = makeStore();
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-a' } }, store);
    const stale = (await provider.list())[0];
    await manager.setSkillEnabled({ sourceId: 'source-a', name: 'nature-writing', enabled: false });
    assert.deepEqual(await provider.list(), []);
    assert.equal(await provider.get(stale), undefined);
    const view = await store.view();
    const writer = view.entries.find(entry => entry.botId === 'bot-a');
    assert.equal(writer.skills[0].reason, 'disabled');
    await manager.setSkillEnabled({ sourceId: 'source-a', name: 'nature-writing', enabled: true });
    assert.deepEqual((await provider.list()).map(row => row.name), ['nature-writing']);
  });

  it('survives a restart and drops a removed source without leaking another role', async () => {
    const restartedManager = new SkillSourceManager({ dataRoot, log: { warn() {} } });
    const restartedStore = new ResearchRoleStore({
      dataRoot,
      manager: restartedManager,
      log: { warn() {} },
      ctx: adapterCtx(),
    });
    const providerA = createSkillProvider(restartedManager, { warn() {} }, { session: { id: 'bot-a' } }, restartedStore);
    const providerB = createSkillProvider(restartedManager, { warn() {} }, { session: { id: 'bot-b' } }, restartedStore);
    assert.deepEqual((await providerA.list()).map(row => row.name), ['nature-writing']);
    assert.deepEqual((await providerB.list()).map(row => row.name), ['nature-paper-xray']);

    await restartedManager.removeSource('source-a');
    assert.deepEqual(await providerA.list(), []);
    assert.deepEqual((await providerB.list()).map(row => row.name), []);
    const view = await restartedStore.view();
    const writer = view.entries.find(entry => entry.botId === 'bot-a');
    assert.equal(writer.skills[0].reason, 'source-missing');
    assert.equal(writer.skills[0].available, false);

    await restartedManager.addLocalSource({ path: join(root, 'skills-a'), title: 'Source A', id: 'source-a' });
    assert.deepEqual((await providerA.list()).map(row => row.name), ['nature-writing']);
    assert.deepEqual((await providerB.list()).map(row => row.name), ['nature-paper-xray']);
  });

  it('keeps a corrupt roles file intact and never falls back to the catalog', async () => {
    const file = join(dataRoot, 'roles.json');
    const good = await readFile(file);
    await writeFile(file, '{"version":1,"pending":', 'utf8');
    const store = makeStore();
    await assert.rejects(() => readRoleFile(file), error => error instanceof SkillError && error.code === 'corrupt');
    const view = await store.view();
    assert.equal(view.compatible, false);
    assert.equal(typeof view.error, 'string');
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'bot-a' } }, store);
    assert.deepEqual(await provider.list(), []);
    assert.equal(await readFile(file, 'utf8'), '{"version":1,"pending":');
    await writeFile(file, good);
  });
});

describe('role HTTP surface', () => {
  const fakeCtx = { get: () => undefined };
  const handler = (store = makeStore()) => createWorkbenchHandler({
    ctx: fakeCtx,
    manager,
    roles: store,
    token: TOKEN,
    version: '0.1.0',
  });
  const post = (store, body, headers = {}) => handler(store)(new Request(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-workbench-token': TOKEN, ...headers },
    body: JSON.stringify(body),
  }));

  it('creates, edits, and removes a role through authenticated actions', async () => {
    const store = makeStore();
    const team = await readTeam();
    team.bots['bot-http'] = { id: 'bot-http', name: 'HTTP Bot', sessionId: 'bot-http' };
    await writeJsonAtomic(stateFile(), team);

    const prepared = await post(store, {
      action: 'prepare-role',
      templateId: 'peer-review',
      name: 'HTTP Bot',
      skills: [{ sourceId: 'source-b', name: 'nature-data' }],
    });
    assert.equal(prepared.status, 200);
    const preparedBody = await prepared.json();
    assert.equal(typeof preparedBody.transactionId, 'string');
    assert.equal(preparedBody.roleStatus.pending.find(entry => entry.transactionId === preparedBody.transactionId).name, 'HTTP Bot');

    await registerBotMarker('bot-http', preparedBody.transactionId);
    const completed = await post(store, {
      action: 'complete-role',
      transactionId: preparedBody.transactionId,
      botId: 'bot-http',
    });
    assert.equal(completed.status, 200);
    const completedBody = await completed.json();
    assert.equal(completedBody.roleStatus.entries.some(entry => entry.botId === 'bot-http'), true);

    const edited = await post(store, {
      action: 'set-role-skills',
      botId: 'bot-http',
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
    });
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).role.skills[0].name, 'nature-writing');

    const removed = await post(store, { action: 'remove-role', botId: 'bot-http' });
    assert.equal(removed.status, 200);
    assert.equal((await removed.json()).roleStatus.entries.some(entry => entry.botId === 'bot-http'), false);
  });

  it('refuses a missing token, an unknown template, and a held role lock', async () => {
    const store = makeStore();
    const noToken = await handler(store)(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'remove-role', botId: 'bot-a' }),
    }));
    assert.equal(noToken.status, 403);

    const unknown = await post(store, { action: 'prepare-role', templateId: 'nope', name: 'X', skills: [] });
    assert.equal(unknown.status, 404);

    const lock = join(dataRoot, 'roles.lock');
    await writeFile(lock, JSON.stringify({ pid: process.ppid, createdAt: new Date().toISOString() }), 'utf8');
    const busy = await post(store, { action: 'prepare-role', templateId: 'paper-writing', name: 'X', skills: [] });
    assert.equal(busy.status, 423);
    assert.equal((await busy.json()).code, 'busy');
    await rm(lock, { force: true });
  });
});

describe('Git source update', () => {
  it('invalidates a role skill after applyUpdate moves the upstream tree', async () => {
    const work = join(root, 'git-work');
    const bare = join(root, 'git-origin.git');
    await put(join(work, 'nature-old', 'SKILL.md'), skill('nature-old', '旧版技能'));
    await put(join(work, 'shared-lib', 'core.md'), '# core\n');
    const git = (args, cwd) => execFileSync('git', [
      '-c', 'user.name=Role Test', '-c', 'user.email=role@test.invalid', ...args,
    ], { cwd, encoding: 'utf8' }).trim();

    git(['init', '-b', 'main'], work);
    git(['add', '-A'], work);
    git(['commit', '-m', 'initial'], work);
    git(['clone', '--bare', work, bare], root);

    const gitHome = join(root, 'git-home');
    await mkdir(join(gitHome, 'sources'), { recursive: true });
    git(['clone', '--filter=blob:none', '--depth=50', '--single-branch', '--branch', 'main', bare, join(gitHome, 'sources', 'git-src')], root);
    const installed = git(['rev-parse', 'HEAD'], join(gitHome, 'sources', 'git-src'));
    await writeJsonAtomic(join(gitHome, 'state.json'), {
      version: 1,
      sources: [{
        id: 'git-src',
        title: 'Git fixture',
        kind: 'github',
        repository: 'fixture/git',
        branch: 'main',
        syncMode: 'git',
        installedRevision: installed,
      }],
      disabledSkills: [],
      literatureDirs: [],
      pinnedProjects: [],
    });
    await writeJsonAtomic(join(gitHome, 'roles.json'), {
      version: 1,
      pending: {},
      roles: {
        'bot-a': { templateId: 'paper-writing', skills: [{ sourceId: 'git-src', name: 'nature-old' }] },
      },
    });

    const gitManager = new SkillSourceManager({ dataRoot: gitHome, log: { warn() {} } });
    const gitStore = new ResearchRoleStore({ dataRoot: gitHome, manager: gitManager, log: { warn() {} }, ctx: adapterCtx() });
    const provider = createSkillProvider(gitManager, { warn() {} }, { session: { id: 'bot-a' } }, gitStore);
    const stale = (await provider.list())[0];
    assert.equal(stale.name, 'nature-old');

    await rm(join(work, 'nature-old'), { recursive: true, force: true });
    await put(join(work, 'nature-new', 'SKILL.md'), skill('nature-new', '新版技能'));
    git(['add', '-A'], work);
    git(['commit', '-m', 'rename skill'], work);
    git(['push', bare, 'main'], work);

    const updated = await gitManager.applyUpdate('git-src');
    assert.notEqual(updated.installedRevision, installed);
    // The selected key is retained, not silently renamed: the old directory is gone.
    assert.deepEqual(await provider.list(), []);
    assert.equal(await provider.get(stale), undefined);
    const view = await gitStore.view();
    assert.equal(view.entries[0].skills[0].reason, 'missing');
    await gitStore.setSkills({ botId: 'bot-a', skills: [{ sourceId: 'git-src', name: 'nature-new' }] });
    const definition = await provider.get((await provider.list())[0]);
    assert.equal(definition.name, 'nature-new');
    assert.equal(definition.resourceBase.path, join(gitHome, 'sources', 'git-src', 'nature-new'));
  });
});


describe('projects', () => {
  const projectA = 'ws-project-a';
  const projectB = 'ws-project-b';
  const projectRoot = name => join(root, name);

  function registryFixture(projects) {
    const byId = new Map(projects.map(project => [project.id, project]));
    return {
      list: () => [...byId.values()],
      get: id => byId.get(id),
      resolveByPath: async () => undefined,
      create: async () => {
        throw new Error('must not create');
      },
    };
  }

  async function prepareAndComplete(store, { botId, workspaceId, name, model, workDir }) {
    const prepared = await store.prepare({
      templateId: 'paper-writing',
      name,
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
      ...(workspaceId === undefined ? {} : { workspaceId }),
      ...(model === undefined ? {} : { model }),
      ...(workDir === undefined ? {} : { workDir }),
    });
    await registerBotMarker(botId, prepared.transactionId);
    const completed = await store.complete({ transactionId: prepared.transactionId, botId });
    return { prepared, completed };
  }

  before(async () => {
    await mkdir(projectRoot('project-a'), { recursive: true });
    await mkdir(projectRoot('project-b'), { recursive: true });
    const team = await readTeam();
    team.bots['bot-pa'] = { id: 'bot-pa', name: 'Project A writer', model: 'rw-test/model-a', sessionId: 'bot-pa' };
    team.bots['bot-pb'] = { id: 'bot-pb', name: 'Project B writer', model: 'rw-test/model-b', sessionId: 'bot-pb' };
    team.bots['bot-legacy'] = { id: 'bot-legacy', name: 'Legacy', sessionId: 'bot-legacy' };
    team.bots['bot-gone'] = { id: 'bot-gone', name: 'Gone', sessionId: 'bot-gone' };
    team.bots['bot-http-project'] = { id: 'bot-http-project', name: 'HTTP project role', sessionId: 'bot-http-project' };
    await writeJsonAtomic(stateFile(), team);
  });

  it('reads a version 1 file as version 2 and upgrades it on the first write', async () => {
    const legacyRoot = join(root, 'legacy-home');
    await mkdir(legacyRoot, { recursive: true });
    const file = join(legacyRoot, 'roles.json');
    await writeJsonAtomic(file, {
      version: 1,
      pending: {},
      roles: { 'bot-legacy': { templateId: 'paper-writing', skills: [{ sourceId: 'source-a', name: 'nature-writing' }] } },
    });
    const state = await readRoleFile(file);
    assert.equal(state.version, 2);
    assert.equal(state.roles['bot-legacy'].workspaceId, undefined);

    const legacyStore = new ResearchRoleStore({ dataRoot: legacyRoot, manager, log: { warn() {} }, ctx: adapterCtx() });
    await legacyStore.setSkills({ botId: 'bot-legacy', skills: [{ sourceId: 'source-a', name: 'nature-writing' }] });
    const written = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(written.version, 2);
    assert.equal(written.roles['bot-legacy'].workspaceId, undefined);
    assert.deepEqual(written.roles['bot-legacy'].skills, [{ sourceId: 'source-a', name: 'nature-writing' }]);
  });

  it('keeps project, model, and folder on an unfinished creation across a restart', async () => {
    const store = makeStore();
    const prepared = await store.prepare({
      templateId: 'paper-writing',
      name: 'Pending in A',
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
      workspaceId: projectA,
      model: 'rw-test/model-a',
      workDir: projectRoot('project-a'),
    });
    const restarted = makeStore();
    const pending = (await restarted.view()).pending.find(entry => entry.transactionId === prepared.transactionId);
    assert.equal(pending.workspaceId, projectA);
    assert.equal(pending.model, 'rw-test/model-a');
    assert.equal(pending.workDir, projectRoot('project-a'));
    await restarted.cancel({ transactionId: prepared.transactionId });
  });

  it('binds a Bot once and answers the existing role when completion is retried', async () => {
    const store = makeStore();
    const { prepared, completed } = await prepareAndComplete(store, {
      botId: 'bot-pa', workspaceId: projectA, name: 'Project A writer',
    });
    assert.equal(completed.role.workspaceId, projectA);
    assert.equal(completed.already, undefined);

    const retried = await store.complete({ transactionId: prepared.transactionId, botId: 'bot-pa' });
    assert.equal(retried.already, true);
    assert.equal(retried.role.workspaceId, projectA);
    const file = JSON.parse(await readFile(join(dataRoot, 'roles.json'), 'utf8'));
    assert.equal(file.roles['bot-pa'].workspaceId, projectA);
    assert.equal(Object.hasOwn(file.pending, prepared.transactionId), false);

    const other = await store.prepare({
      templateId: 'paper-writing',
      name: 'Other',
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
    });
    await assert.rejects(
      () => store.complete({ transactionId: other.transactionId, botId: 'bot-pa' }),
      error => error instanceof SkillError && error.code === 'invalid',
    );
    await store.cancel({ transactionId: other.transactionId });
  });

  it('filters roles by project and keeps an old assistant unassigned', async () => {
    const store = makeStore();
    await prepareAndComplete(store, { botId: 'bot-pb', workspaceId: projectB, name: 'Project B writer' });
    await prepareAndComplete(store, { botId: 'bot-legacy', name: 'Legacy' });
    const entries = (await store.view()).entries;
    const inA = entries.filter(entry => entry.workspaceId === projectA).map(entry => entry.botId);
    const inB = entries.filter(entry => entry.workspaceId === projectB).map(entry => entry.botId);
    const unassigned = entries.filter(entry => entry.workspaceId === null).map(entry => entry.botId);
    assert.deepEqual(inA, ['bot-pa']);
    assert.deepEqual(inB, ['bot-pb']);
    assert.equal(unassigned.includes('bot-legacy'), true);
    assert.equal(unassigned.includes('bot-pa'), false);
  });

  it('moves an assistant between projects only on a current expectation', async () => {
    const store = makeStore();
    const joined = await store.setProject({ botId: 'bot-legacy', workspaceId: projectA, expectedWorkspaceId: null });
    assert.equal(joined.workspaceId, projectA);
    await assert.rejects(
      () => store.setProject({ botId: 'bot-legacy', workspaceId: projectB, expectedWorkspaceId: null }),
      error => error instanceof SkillError && error.code === 'conflict',
    );
    const moved = await store.setProject({ botId: 'bot-legacy', workspaceId: projectB, expectedWorkspaceId: projectA });
    assert.equal(moved.workspaceId, projectB);
    const left = await store.setProject({ botId: 'bot-legacy', workspaceId: null, expectedWorkspaceId: projectB });
    assert.equal(left.workspaceId, null);
    assert.equal((await store.view()).entries.find(entry => entry.botId === 'bot-legacy').workspaceId, null);
    assert.equal((await readTeam()).bots['bot-legacy'].id, 'bot-legacy');
  });

  it('refuses to join a project for a Bot DS-Bot no longer has, but allows leaving', async () => {
    const store = makeStore();
    await prepareAndComplete(store, { botId: 'bot-gone', workspaceId: projectB, name: 'Deleted soon' });
    const team = await readTeam();
    delete team.bots['bot-gone'];
    await writeJsonAtomic(stateFile(), team);

    await assert.rejects(
      () => store.setProject({ botId: 'bot-gone', workspaceId: projectA, expectedWorkspaceId: projectB }),
      error => error instanceof SkillError && error.code === 'not_found',
    );
    const left = await store.setProject({ botId: 'bot-gone', workspaceId: null, expectedWorkspaceId: projectB });
    assert.equal(left.workspaceId, null);
    const entry = (await store.view()).entries.find(row => row.botId === 'bot-gone');
    assert.equal(entry.missing, true);

    team.bots['bot-gone'] = { id: 'bot-gone', name: 'Gone', sessionId: 'bot-gone' };
    team.bots['bot-http-project'] = { id: 'bot-http-project', name: 'HTTP project role', sessionId: 'bot-http-project' };
    await writeJsonAtomic(stateFile(), team);
  });

  it('moves, detaches, and re-joins through the HTTP actions with a live registry', async () => {
    const store = makeStore();
    const registry = registryFixture([
      { id: projectA, path: projectRoot('project-a'), title: 'A', sessionIds: [] },
      { id: projectB, path: projectRoot('project-b'), title: 'B', sessionIds: [] },
    ]);
    const handler = createWorkbenchHandler({
      ctx: { get: name => (name === 'workspaceRegistry' ? registry : undefined) },
      manager,
      roles: store,
      token: TOKEN,
      version: '0.1.0',
    });
    const post = body => handler(new Request(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-workbench-token': TOKEN },
      body: JSON.stringify(body),
    }));

    const prepared = await post({
      action: 'prepare-role',
      templateId: 'paper-writing',
      name: 'HTTP project role',
      skills: [{ sourceId: 'source-a', name: 'nature-writing' }],
      workspaceId: projectA,
      model: 'rw-test/model-a',
      workDir: projectRoot('project-a'),
    });
    assert.equal(prepared.status, 200);
    const preparedBody = await prepared.json();
    assert.equal(preparedBody.pending.workspaceId, projectA);
    assert.equal(preparedBody.roleStatus.pending.find(entry => entry.transactionId === preparedBody.transactionId).model, 'rw-test/model-a');
    await registerBotMarker('bot-http-project', preparedBody.transactionId);
    const completed = await post({ action: 'complete-role', transactionId: preparedBody.transactionId, botId: 'bot-http-project' });
    assert.equal((await completed.json()).role.workspaceId, projectA);
    const retried = await post({ action: 'complete-role', transactionId: preparedBody.transactionId, botId: 'bot-http-project' });
    assert.equal(retried.status, 200);
    const retriedBody = await retried.json();
    assert.equal(retriedBody.already, true);
    assert.equal(retriedBody.role.workspaceId, projectA);
    assert.equal(retriedBody.roleStatus.entries.filter(entry => entry.botId === 'bot-http-project').length, 1);

    const stale = await post({ action: 'set-role-project', botId: 'bot-http-project', workspaceId: projectB, expectedWorkspaceId: null });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, 'conflict');

    const moved = await post({ action: 'set-role-project', botId: 'bot-http-project', workspaceId: projectB, expectedWorkspaceId: projectA });
    assert.equal(moved.status, 200);
    assert.equal((await moved.json()).roleStatus.entries.find(entry => entry.botId === 'bot-http-project').workspaceId, projectB);

    const unknown = await post({ action: 'set-role-project', botId: 'bot-http-project', workspaceId: 'ws-missing', expectedWorkspaceId: projectB });
    assert.equal(unknown.status, 404);

    const detached = await post({ action: 'set-role-project', botId: 'bot-http-project', workspaceId: null, expectedWorkspaceId: projectB });
    assert.equal(detached.status, 200);
    assert.equal((await detached.json()).roleStatus.entries.find(entry => entry.botId === 'bot-http-project').workspaceId, null);
    assert.equal((await readTeam()).bots['bot-http-project'].id, 'bot-http-project');
  });

  it('keeps an assistant visible when its project folder disappears', async () => {
    const store = makeStore();
    await store.setProject({ botId: 'bot-pa', workspaceId: projectA, expectedWorkspaceId: projectA });
    const registry = registryFixture([{ id: projectA, path: join(root, 'project-a-missing'), title: 'A', sessionIds: [] }]);
    const handler = createWorkbenchHandler({
      ctx: { get: name => (name === 'workspaceRegistry' ? registry : undefined) },
      manager,
      roles: store,
      token: TOKEN,
      version: '0.1.0',
    });
    const payload = await (await handler(new Request(`${API}?action=bootstrap`, { method: 'GET' }))).json();
    assert.equal(payload.workspaceAvailability[projectA], false);
    const entry = payload.roleStatus.entries.find(row => row.botId === 'bot-pa');
    assert.equal(entry.workspaceId, projectA);
    assert.equal(entry.name, 'Project A writer');
  });

  it('gives two project assistants their own skills in one group chat and its segments', async () => {
    const team = await readTeam();
    team.bots['bot-pa'].segments = [{ sessionId: 'pa-old' }];
    team.bots['bot-pb'].segments = [{ sessionId: 'pb-old' }];
    team.rooms = {
      'room-projects': {
        id: 'room-projects',
        name: 'Project room',
        members: ['bot-pa', 'bot-pb'],
        workDir: projectRoot('project-a'),
        sessions: { 'bot-pa': 'pa-room', 'bot-pb': 'pb-room' },
        segments: { 'bot-pa': [{ sessionId: 'pa-room-old' }], 'bot-pb': [{ sessionId: 'pb-room-old' }] },
      },
    };
    await writeJsonAtomic(stateFile(), team);
    const store = makeStore();
    const names = async sessionId => (await createSkillProvider(manager, { warn() {} }, { session: { id: sessionId } }, store).list()).map(row => row.name);
    for (const sessionId of ['bot-pa', 'pa-old', 'pa-room', 'pa-room-old']) {
      assert.deepEqual(await names(sessionId), ['nature-writing'], sessionId);
    }
    for (const sessionId of ['bot-pb', 'pb-old', 'pb-room', 'pb-room-old']) {
      assert.deepEqual(await names(sessionId), ['nature-writing'], sessionId);
    }
  });
});
