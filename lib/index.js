/**
 * dsh-research-workbench — host half.
 *
 * Responsibilities, in load order:
 *  1. own the upstream skill checkouts under `$DSH_HOME/dsh-research-workbench`,
 *  2. publish them into `ctx.skills` as a provider whose resource base is the
 *     skill's own directory, so `../<sibling>/` references resolve on disk,
 *  3. serve the workbench's JSON API to the browser half.
 *
 * Nothing here re-implements a DSH core: workspaces, sessions, titles,
 * directory picking, and native file opening all stay with their own services.
 *
 * @module dsh-research-workbench
 */

import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { SkillSourceManager, parseFrontmatter } from './skill-manager.js';
import { createWorkbenchHandler } from './workbench-api.js';
import { SKILL_NAME, resolveWorkbenchHome } from './skill-sources.js';

const require = createRequire(import.meta.url);
const VERSION = require('../package.json').version;

/** Provider name this plugin registers on `ctx.skills`. */
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

/**
 * Build the provider object handed to `ctx.skills.registerProvider`.
 * @param manager - the source manager owning the on-disk catalog.
 * @param log - logger used for unreadable skill files.
 * @returns the provider the registry calls.
 */
export function createSkillProvider(manager, log) {
  return {
    name: PROVIDER_NAME,
    async list() {
      const rows = await manager.invocableSkills();
      return rows.map(row => ({
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
      }));
    },
    async get(candidate) {
      const file = candidate?.locator?.path;
      const directory = candidate?.locator?.directory;
      const sourceId = candidate?.locator?.sourceId;
      if (typeof file !== 'string' || typeof directory !== 'string' || typeof sourceId !== 'string') return undefined;
      const state = await manager.load();
      if (state.disabledSkills.includes(`${sourceId}/${candidate.name}`)) return undefined;
      let raw;
      try {
        raw = await readFile(file, 'utf8');
      } catch (error) {
        log?.warn?.(`research-workbench: skill file ${file} is unreadable: ${error?.message ?? error}`);
        return undefined;
      }
      const parsed = parseFrontmatter(raw);
      if (parsed === undefined) {
        log?.warn?.(`research-workbench: skill file ${file} lost its frontmatter`);
        return undefined;
      }
      const skillName = parsed.data.name;
      const description = parsed.data.description;
      if (typeof skillName !== 'string' || !SKILL_NAME.test(skillName)) return undefined;
      if (typeof description !== 'string' || description.trim() === '') return undefined;
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
        resourceBase: { kind: 'directory', path: directory },
        path: file,
        content: parsed.body.trim(),
        ...(metadata === undefined ? {} : { metadata }),
      };
    },
  };
}

export function apply(ctx) {
  const dataRoot = resolveWorkbenchHome();
  const manager = new SkillSourceManager({ dataRoot, log: ctx.logger });
  const token = randomBytes(24).toString('hex');

  // Skills: register synchronously during apply so the first catalog read of
  // any session already sees the workbench subset.
  ctx.inject(['skills'], (child) => {
    child.effect(() => {
      let control;
      const disposeProvider = child.skills.registerProvider((registration) => {
        control = registration;
        return createSkillProvider(manager, child.logger);
      });
      const stop = manager.onChange(() => control?.invalidate());
      return () => {
        stop();
        disposeProvider();
      };
    }, 'research-workbench: skill provider');
  });

  ctx.inject(['connection'], (child) => {
    child.effect(() => child.connection.fetch.register({
      path: API_PATH,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: createWorkbenchHandler({
        ctx: child,
        manager,
        token,
        version: VERSION,
        resolve: serviceName => optionalService(child, serviceName) ?? optionalService(ctx, serviceName),
      }),
    }), 'research-workbench: HTTP route');
  });
}

/** Exported for tests that need the same resolution rule the handler uses. */
export { optionalService };
