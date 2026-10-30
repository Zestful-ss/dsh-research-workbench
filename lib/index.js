/**
 * dsh-research-workbench — host half.
 *
 * Responsibilities, in load order:
 *  1. own the upstream skill checkouts under `$DSH_HOME/dsh-research-workbench`,
 *  2. give each live Agent a scoped provider that resolves that Agent's
 *     Session to a research role and publishes only that role's skills,
 *  3. serve the workbench's JSON API to the browser half.
 *
 * Nothing here re-implements a DSH core: workspaces, sessions, titles,
 * directory picking, native file opening, and DS-Bot's Bot team all stay with
 * their own services.
 *
 * @module dsh-research-workbench
 */

import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { SkillSourceManager, parseFrontmatter } from './skill-manager.js';
import { createWorkbenchHandler } from './workbench-api.js';
import { SKILL_NAME, resolveWorkbenchHome } from './skill-sources.js';
import { ResearchRoleStore, evaluateSelection } from './research-roles.js';

const require = createRequire(import.meta.url);
const VERSION = require('../package.json').version;

/** Provider name this plugin registers on each Agent's `ctx.skills`. */
export const PROVIDER_NAME = 'research-workbench';

/**
 * Precedence rank. The registry sorts ascending, so a workbench skill is
 * preferred over a bundled filesystem root (600) and gives way to project
 * skills the operator wrote inside the workspace itself.
 */
export const SKILL_RANK = 350;

/** Route the browser half calls. */
export const API_PATH = '/api/dsh-research-workbench';

export const name = 'dsh-research-workbench';

/** Resolve an optional service without letting an absent one break the plugin. */
function optionalService(ctx, serviceName) {
  try {
    return ctx.get(serviceName) ?? undefined;
  } catch {
    return undefined;
  }
}

function candidateOf(row) {
  return {
    name: row.name,
    description: row.description,
    ...(row.whenToUse === undefined ? {} : { whenToUse: row.whenToUse }),
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: 'custom',
    rank: SKILL_RANK,
    locator: { path: row.skillFilePath, directory: row.skillDirPath, sourceId: row.sourceId },
    resourceBase: { kind: 'directory', path: row.skillDirPath },
    path: row.skillFilePath,
  };
}

/**
 * Build one Agent's role-scoped provider.
 *
 * The provider is mounted inside the Agent's own skill layer, so its `list()`
 * is the only catalog that Agent sees from this plugin. A missing role, a
 * non-Bot Session, a normal Agent, and a non-research Bot all answer with an
 * empty array; there is no global fallback.
 *
 * @param manager - the source manager owning the on-disk catalog.
 * @param log - logger used for unreadable skill files.
 * @param agent - the Agent whose Session decides the role.
 * @param roleStore - resolves Session ids to research roles.
 * @returns the provider the Agent-scoped registry calls.
 */
export function createSkillProvider(manager, log, agent, roleStore) {
  const sessionId = () => agent?.session?.id;
  return {
    name: PROVIDER_NAME,
    async list() {
      if (roleStore === undefined) return [];
      let resolution;
      try {
        if (!(await roleStore.hasAny())) return [];
        resolution = await roleStore.resolveSession(sessionId());
      } catch {
        return [];
      }
      if (resolution?.status !== 'role') return [];
      let rows;
      try {
        rows = await manager.scanSkills();
      } catch {
        return [];
      }
      const evaluation = evaluateSelection(rows, resolution.skills ?? []);
      return evaluation.entries
        .filter(entry => entry.available && entry.rows.length === 1)
        .map(entry => candidateOf(entry.rows[0]));
    },
    async get(candidate) {
      if (roleStore === undefined) return undefined;
      const name = candidate?.name;
      const sourceId = candidate?.locator?.sourceId;
      if (typeof name !== 'string' || typeof sourceId !== 'string') return undefined;
      let resolution;
      try {
        if (!(await roleStore.hasAny())) return undefined;
        resolution = await roleStore.resolveSession(sessionId());
      } catch {
        return undefined;
      }
      if (resolution?.status !== 'role') return undefined;
      const key = `${sourceId}/${name}`;
      if (!resolution.skills.some(entry => `${entry.sourceId}/${entry.name}` === key)) return undefined;

      // Re-scan rather than trusting the locator: a source update, a disabled
      // flag, or a duplicate-path conflict must take effect before the body is
      // handed to a model.
      let evaluation;
      try {
        evaluation = evaluateSelection(await manager.scanSkills({ fresh: true }), resolution.skills);
      } catch {
        return undefined;
      }
      const entry = evaluation.entries.find(item => item.key === key);
      if (entry === undefined || !entry.available || entry.rows.length !== 1) return undefined;
      const row = entry.rows[0];

      let raw;
      try {
        raw = await readFile(row.skillFilePath, 'utf8');
      } catch (error) {
        log?.warn?.(`research-workbench: skill file ${row.skillFilePath} is unreadable: ${error?.message ?? error}`);
        return undefined;
      }
      const parsed = parseFrontmatter(raw);
      if (parsed === undefined) {
        log?.warn?.(`research-workbench: skill file ${row.skillFilePath} lost its frontmatter`);
        return undefined;
      }
      const skillName = parsed.data.name;
      const description = parsed.data.description;
      if (skillName !== name || typeof description !== 'string' || description.trim() === '') return undefined;
      const whenToUse = typeof parsed.data.whenToUse === 'string' ? parsed.data.whenToUse : undefined;
      const metadata = parsed.data.metadata !== null && typeof parsed.data.metadata === 'object' && !Array.isArray(parsed.data.metadata)
        ? parsed.data.metadata
        : undefined;
      return {
        name: skillName,
        description: description.trim(),
        ...(whenToUse === undefined ? {} : { whenToUse }),
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'custom',
        provider: PROVIDER_NAME,
        resourceBase: { kind: 'directory', path: row.skillDirPath },
        path: row.skillFilePath,
        content: parsed.body.trim(),
        ...(metadata === undefined ? {} : { metadata }),
      };
    },
  };
}

/**
 * Mount the role provider onto one Agent's scoped context.
 *
 * The shape follows DS-Bot's own per-Agent capability mount: a child plugin
 * injects `skills`, registers synchronously during apply, and is awaited so
 * the Agent's first request already sees the provider.
 */
function createAgentProviderMount({ manager, roleStore, log }) {
  /** @type {Map<object, {fiber:any, control:any, identity:string|undefined}>} */
  const mounts = new Map();

  const identityOf = (resolution) => {
    if (resolution?.status !== 'role') return `status:${resolution?.status ?? 'none'}`;
    const skills = [...resolution.skills]
      .map(key => `${key.sourceId}/${key.name}`)
      .sort()
      .join(',');
    return `role:${resolution.botId}:${resolution.via ?? 'role'}:${resolution.templateId}:${skills}`;
  };

  const mount = async (agent) => {
    if (agent === undefined || mounts.has(agent)) return;
    if (agent.ctx === undefined || typeof agent.ctx.plugin !== 'function') return;
    const record = { fiber: undefined, control: undefined, identity: undefined };
    mounts.set(agent, record);
    try {
      const fiber = agent.ctx.plugin({
        inject: ['skills'],
        apply(scoped) {
          scoped.effect(() => {
            const dispose = scoped.skills.registerProvider((control) => {
              record.control = control;
              return createSkillProvider(manager, scoped.logger ?? log, agent, roleStore);
            });
            return () => {
              record.control = undefined;
              dispose();
            };
          }, 'research-workbench: role skill provider');
        },
      });
      record.fiber = fiber;
      if (typeof fiber?.await === 'function') await fiber.await();
      else await fiber;
    } catch (error) {
      mounts.delete(agent);
      log?.warn?.(`research-workbench: skill provider for ${agent?.session?.id ?? agent?.id} not mounted: ${error?.message ?? error}`);
    }
  };

  const unmount = async (agent) => {
    const record = mounts.get(agent);
    if (record === undefined) return;
    mounts.delete(agent);
    try {
      await record.fiber?.dispose?.();
    } catch (error) {
      log?.warn?.(`research-workbench: skill provider dispose failed: ${error?.message ?? error}`);
    }
  };

  const disposeAll = async () => {
    const live = [...mounts.values()];
    mounts.clear();
    await Promise.all(live.map(async (record) => {
      try {
        await record.fiber?.dispose?.();
      } catch (error) {
        log?.warn?.(`research-workbench: skill provider dispose failed: ${error?.message ?? error}`);
      }
    }));
  };

  return { mounts, mount, unmount, disposeAll, identityOf };
}

export function apply(ctx) {
  const dataRoot = resolveWorkbenchHome();
  const manager = new SkillSourceManager({ dataRoot, log: ctx.logger });
  const roles = new ResearchRoleStore({ dataRoot, manager, log: ctx.logger, ctx });
  const token = randomBytes(24).toString('hex');
  const providerMount = createAgentProviderMount({ manager, roleStore: roles, log: ctx.logger });
  const lastKnownResearch = new Set();

  ctx.effect(() => roles.onChange(() => manager.invalidate()), 'research-workbench: role invalidations');

  ctx.inject(['agents'], (agentCtx) => {
    const agents = agentCtx.agents;

    const onPreStep = async ({ agent } = {}, next) => {
      if (typeof next !== 'function') return undefined;
      const sessionId = agent?.session?.id ?? agent?.id;
      if (typeof sessionId !== 'string' || sessionId === '') return next();

      let resolution;
      try {
        if (!(await roles.hasAny())) return next();
        resolution = await roles.resolveSession(sessionId);
      } catch (error) {
        resolution = { status: 'error', detail: error?.message ?? String(error) };
      }

      if (resolution.status === 'role') {
        lastKnownResearch.add(sessionId);
        const record = providerMount.mounts.get(agent);
        const identity = providerMount.identityOf(resolution);
        if (record !== undefined && record.identity !== identity) {
          record.identity = identity;
          record.control?.invalidate();
        }
        return next();
      }
      if (resolution.status === 'none') {
        lastKnownResearch.delete(sessionId);
        return next();
      }

      // DS-Bot state or roles are unreadable. A Session already known to be a
      // research assistant, or any step while a role creation is unfinished,
      // cannot prove it does not belong to a role: refuse rather than fall
      // back to the full source catalog.
      if (lastKnownResearch.has(sessionId)) return { kind: 'reject' };
      if (await roles.hasPending()) return { kind: 'reject' };
      return next();
    };

    agentCtx.effect(() => {
      for (const agent of agents?.list?.() ?? []) void providerMount.mount(agent);
      return () => providerMount.disposeAll();
    }, 'research-workbench: existing agent providers');

    agentCtx.on('agent/created', async ({ agent }) => {
      await providerMount.mount(agent);
    });
    agentCtx.on('agent/disposed', async ({ agent }) => {
      await providerMount.unmount(agent);
    });
    agentCtx.on('agent/pre-step', onPreStep);
  });

  ctx.inject(['connection'], (child) => {
    child.effect(() => child.connection.fetch.register({
      path: API_PATH,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: createWorkbenchHandler({
        ctx: child,
        manager,
        roles,
        token,
        version: VERSION,
        resolve: serviceName => optionalService(child, serviceName) ?? optionalService(ctx, serviceName),
      }),
    }), 'research-workbench: HTTP route');
  });
}

/** Exported for tests that need the same resolution rule the handler uses. */
export { optionalService };
