/**
 * Wiring tests for both halves of the plugin.
 *
 * The host entry must publish a skill provider and the API route into the
 * contexts it is handed; the browser bundle must register its three slots
 * with the exact option shapes the host's slot framework reads.
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
  it('registers a skill provider and the JSON route inside their own contexts', async () => {
    const dataRoot = await mkdtemp(join(tmpdir(), 'dsh-rw-wiring-'));
    const registrations = [];
    const effects = [];
    const providerHolder = { provider: undefined, invalidated: 0 };

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
          effect: (fn) => {
            const dispose = fn();
            effects.push(dispose);
            return dispose;
          },
          skills: {
            registerProvider: (create) => {
              providerHolder.provider = create({ invalidate: () => { providerHolder.invalidated += 1; } });
              return () => {};
            },
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
    } finally {
      if (previousHome === undefined) delete process.env.DSH_HOME;
      else process.env.DSH_HOME = previousHome;
    }

    assert.equal(providerHolder.provider.name, PROVIDER_NAME);
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].path, API_PATH);
    assert.deepEqual(registrations[0].methods, ['GET', 'POST']);
    assert.equal(registrations[0].requestBody, 'buffered');
    assert.equal(typeof registrations[0].fetch, 'function');

    const provider = providerHolder.provider;
    assert.deepEqual(await provider.list(), []);
    assert.equal(await provider.get({ name: 'nope', locator: {} }), undefined);

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
    const provider = createSkillProvider(manager, { warn() {} });

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

  before(async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
    const sandbox = {
      console,
      document: {
        querySelector: () => ({}),
        createElement: () => ({ dataset: {} }),
        head: { appendChild() {} },
      },
      __ModuleLoader__: { load: spec => { factory = spec.factory; } },
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    createContext(sandbox);
    runInContext(source, sandbox);
    assert.equal(typeof factory, 'function');
  });

  it('registers the main panel, the sidebar entry, and the settings section', async () => {
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

    assert.deepEqual(injected.sort(), ['settings.section', 'sidebar.panellist']);
    const main = registered.find(entry => entry.options.name === 'main');
    const row = registered.find(entry => entry.options.name === 'sidebar.panellist');
    const section = registered.find(entry => entry.options.name === 'settings.section');
    assert.equal(main.options.key, 'dsh-research-workbench');
    assert.equal(row.options.id, 'dsh-research-workbench');
    assert.equal(typeof row.options.label, 'function');
    assert.equal(section.options.id, 'dsh-research-workbench');

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
});
