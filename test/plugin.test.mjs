/**
 * Wiring tests for both halves of the plugin.
 *
 * The host entry must mount one role-scoped skill provider per live Agent and
 * register the API route; the browser bundle must keep the classic panel and
 * add its shell overrides only in research mode.
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { after, before, describe, it } from 'node:test';

import { apply, createSkillProvider, PROVIDER_NAME, SKILL_RANK, API_PATH } from '../lib/index.js';
import { SkillSourceManager } from '../lib/skill-manager.js';
import { SKILL_NAME } from '../lib/skill-sources.js';

describe('host entry', () => {
  it('mounts one role provider per live Agent and registers the JSON route', async () => {
    const dataRoot = await mkdtemp(join(tmpdir(), 'dsh-rw-wiring-'));
    const registrations = [];
    const effects = [];
    const listeners = [];
    const mountedProviders = [];
    const scopedDisposals = [];

    const agent = {
      id: 'session-1',
      session: { id: 'session-1' },
      ctx: {
        plugin(spec) {
          const scoped = {
            logger: { warn() {} },
            effect: (fn) => {
              const dispose = fn();
              if (typeof dispose === 'function') scopedDisposals.push(dispose);
              return dispose;
            },
            skills: {
              registerProvider: (create) => {
                const provider = create({ invalidate() {} });
                mountedProviders.push(provider);
                return () => {};
              },
            },
          };
          spec.apply(scoped);
          return { await: async () => {}, dispose: async () => {} };
        },
      },
    };

    const fakeCtx = {
      logger: { warn() {} },
      get: () => undefined,
      effect: (fn) => {
        const dispose = fn();
        effects.push(dispose);
        return dispose;
      },
      inject: (names, callback) => {
        const child = {
          logger: { warn() {} },
          get: () => undefined,
          agents: { list: () => [agent] },
          effect: (fn) => {
            const dispose = fn();
            effects.push(dispose);
            return dispose;
          },
          on: (event, listener) => {
            listeners.push({ event, listener });
            return () => {};
          },
          connection: {
            fetch: {
              register: (route) => {
                registrations.push(route);
                return () => {};
              },
            },
          },
        };
        const dispose = callback(child);
        return dispose;
      },
    };

    const previousHome = process.env.DSH_HOME;
    process.env.DSH_HOME = dataRoot;
    try {
      apply(fakeCtx);
      await Promise.resolve();
    } finally {
      if (previousHome === undefined) delete process.env.DSH_HOME;
      else process.env.DSH_HOME = previousHome;
    }

    assert.equal(mountedProviders.length, 1);
    assert.equal(mountedProviders[0].name, PROVIDER_NAME);
    assert.deepEqual(await mountedProviders[0].list(), []);
    assert.equal(await mountedProviders[0].get({ name: 'nope', locator: {} }), undefined);
    assert.equal(listeners.some(entry => entry.event === 'agent/created'), true);
    assert.equal(listeners.some(entry => entry.event === 'agent/disposed'), true);
    assert.equal(listeners.some(entry => entry.event === 'agent/pre-step'), true);

    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].path, API_PATH);
    assert.deepEqual(registrations[0].methods, ['GET', 'POST']);
    assert.equal(registrations[0].requestBody, 'buffered');
    assert.equal(typeof registrations[0].fetch, 'function');

    for (const dispose of scopedDisposals) await dispose();
    for (const dispose of effects) if (typeof dispose === 'function') await dispose();
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('publishes catalog entries the registry accepts, and invalidates on change', async () => {
    const dataRoot = await mkdtemp(join(tmpdir(), 'dsh-rw-provider-'));
    const root = join(dataRoot, 'upstream');
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(join(root, 'skill-a'), { recursive: true });
    await writeFile(join(root, 'skill-a', 'SKILL.md'), '---\nname: skill-a\ndescription: A test skill\n---\n# body\n', 'utf8');

    const manager = new SkillSourceManager({ dataRoot, log: { warn() {} } });
    await manager.addLocalSource({ path: root, id: 'fixture' });
    let invalidated = 0;
    const stop = manager.onChange(() => { invalidated += 1; });
    const roleStore = { hasAny: async () => true, resolveSession: async () => ({ status: 'role', via: 'role', botId: 'bot-1', templateId: 'fixture', skills: [{ sourceId: 'fixture', name: 'skill-a' }] }) };
    const provider = createSkillProvider(manager, { warn() {} }, { session: { id: 'session-1' } }, roleStore);

    const candidates = await provider.list();
    assert.equal(candidates.length, 1);
    const candidate = candidates[0];
    assert.equal(SKILL_NAME.test(candidate.name), true);
    assert.equal(candidate.provider, PROVIDER_NAME);
    assert.equal(candidate.rank, SKILL_RANK);
    assert.equal(candidate.source, 'custom');
    assert.equal(typeof candidate.description, 'string');
    assert.equal(candidate.locator.directory, join(root, 'skill-a'));
    assert.equal(candidate.resourceBase.kind, 'directory');

    const definition = await provider.get(candidate);
    assert.equal(definition.name, 'skill-a');
    assert.equal(definition.provider, PROVIDER_NAME);
    assert.equal(definition.content, '# body');

    const before = invalidated;
    await manager.setSkillEnabled({ sourceId: 'fixture', name: 'skill-a', enabled: false });
    assert.equal(invalidated, before + 1);
    stop();
    await rm(dataRoot, { recursive: true, force: true });
  });
});

describe('browser bundle', () => {
  let factory;
  let storedSurface;

  before(async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      document: {
        querySelector: () => ({}),
        createElement: () => ({ dataset: {} }),
        head: { appendChild() {} },
      },
      localStorage: {
        getItem: () => storedSurface,
        setItem: (_key, value) => { storedSurface = value; },
      },
      __ModuleLoader__: { load: spec => { factory = spec.factory; } },
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    createContext(sandbox);
    runInContext(source, sandbox);
    assert.equal(typeof factory, 'function');
  });

  it('registers the main panel and sidebar entry without a settings section', async () => {
    const React = {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useRef: () => ({ current: undefined }),
      useSyncExternalStore: (subscribe, snapshot) => snapshot(),
    };
    const injected = [];
    const registered = [];
    const effects = [];
    const localeDictionaries = [];
    const fakeCtx = {
      get: () => undefined,
      effect: fn => { const dispose = fn(); effects.push(dispose); return dispose; },
      locale: {
        register: (namespace, dictionaries) => {
          localeDictionaries.push({ namespace, dictionaries });
          return () => {};
        },
        bind: () => key => key,
        subscribe: () => () => {},
        getSnapshot: () => ({}),
      },
      slots: {
        inject: (name, callback) => {
          injected.push(name);
          const dispose = callback();
          return dispose;
        },
        register: (options, component) => {
          registered.push({ options, component });
          return () => {};
        },
      },
    };

    const module = factory(specifier => {
      if (specifier === 'react') return React;
      throw new Error(`unexpected require: ${specifier}`);
    });
    assert.equal(module.inject.includes('slots'), true);
    assert.equal(module.inject.includes('locale'), true);

    module.apply(fakeCtx);

    assert.deepEqual(injected.sort(), ['sidebar.panellist']);
    const main = registered.find(entry => entry.options.name === 'main');
    const row = registered.find(entry => entry.options.name === 'sidebar.panellist');
    const section = registered.find(entry => entry.options.name === 'settings.section');
    assert.equal(main.options.key, 'dsh-research-workbench');
    assert.equal(row.options.id, 'dsh-research-workbench');
    assert.equal(typeof row.options.label, 'function');
    assert.equal(section, undefined);

    const dictionaries = localeDictionaries.find(entry => entry.namespace === 'researchWorkbench').dictionaries;
    const zhKeys = Object.keys(dictionaries.zh).sort();
    const enKeys = Object.keys(dictionaries.en).sort();
    assert.deepEqual(zhKeys, enKeys);
    assert.equal(zhKeys.length > 40, true);
    for (const key of zhKeys) {
      assert.equal(typeof dictionaries.zh[key], 'string');
      assert.equal(dictionaries.en[key].length > 0, true);
    }
  });

  it('installs the research shell overrides only in research mode', async () => {
    storedSurface = 'research';
    const React = {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {},
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useRef: value => ({ current: value }),
      useSyncExternalStore: (subscribe, snapshot) => snapshot(),
    };
    const injected = [];
    const registered = [];
    const fakeCtx = {
      get: () => undefined,
      effect: fn => { const dispose = fn(); return dispose; },
      locale: { register: () => () => {}, bind: () => key => key, subscribe: () => () => {}, getSnapshot: () => ({}) },
      slots: {
        entries: name => (name === 'sidebar.workspaces' ? [{ options: { priority: -100 } }] : []),
        inject: (name, callback) => {
          injected.push(name);
          return callback();
        },
        register: (options, component) => {
          registered.push({ options, component });
          return () => {};
        },
      },
    };
    const module = factory(specifier => {
      if (specifier === 'react') return React;
      throw new Error(`unexpected require: ${specifier}`);
    });
    module.apply(fakeCtx);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(injected.includes('sidebar.workspaces'), true);
    assert.equal(injected.includes('shell.overlay'), true);
    assert.equal(injected.includes('conversation.input.model'), true);
    const workspaces = registered.find(entry => entry.options.name === 'sidebar.workspaces');
    assert.equal(workspaces.options.priority <= -100, true);
    storedSurface = undefined;
  });
});
