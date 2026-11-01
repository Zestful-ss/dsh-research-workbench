/**
 * Read-only adapter for the DS-Bot plugin.
 *
 * The research workbench never owns Bot names, models, chats, or group chats:
 * DS-Bot does. This module only locates the installed DS-Bot (version, profile
 * directory, Bot home), reads its atomically written `state.json`, and builds
 * the Session → Bot index the skill provider needs. Writes always go through
 * DS-Bot's own same-origin `POST /api/bot` route from the browser half.
 *
 * Supported surface: DS-Bot 0.2.3 and 0.2.4, state version 1.
 *
 * @module dsh-research-workbench/ds-bot
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/** DS-Bot releases whose state and API this adapter supports. */
export const SUPPORTED_VERSIONS = Object.freeze(['0.2.3', '0.2.4']);

/** DS-Bot's own HTTP route on the shared same-origin `/api` channel. */
export const DS_BOT_ROUTE = '/api/bot';

const TRANSACTION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MARKER =
  /<!--\s*research-workbench:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*-->/i;

/**
 * The invisible marker appended to a Bot's instructions while its research role
 * is being created. DS-Bot keeps instructions verbatim, so it survives both the
 * API response and a restart.
 * @param transactionId - UUID of the pending role transaction.
 * @returns the HTML comment appended to the instructions.
 */
export function roleMarker(transactionId) {
  return `<!-- research-workbench:${transactionId} -->`;
}

/**
 * Read the pending transaction marker from a Bot's instructions.
 * @param instructions - the Bot's instruction text.
 * @returns the transaction UUID, or `undefined`.
 */
export function markerOf(instructions) {
  if (typeof instructions !== 'string') return undefined;
  const match = MARKER.exec(instructions);
  return match === null ? undefined : match[1].toLowerCase();
}

/** Test whether a value is one of the UUIDs `roleMarker` writes. */
export function isTransactionId(value) {
  return typeof value === 'string' && TRANSACTION_ID.test(value);
}

/** Resolve the harness home the same way the rest of the workbench does. */
function dshHomeOf(env) {
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : '';
  return configured === '' ? join(homedir(), '.dsh') : resolve(configured);
}

/** Read one optional service property without letting its absence throw. */
function serviceOf(ctx, name) {
  try {
    return ctx?.get?.(name);
  } catch {
    return undefined;
  }
}

/**
 * Read the installed DS-Bot version from the active profile's node_modules.
 * @param profileDir - profile directory reported by `profileContext`.
 * @returns version text, or `undefined` when the package cannot be read.
 */
async function installedVersion(profileDir) {
  if (typeof profileDir !== 'string' || profileDir === '') return undefined;
  try {
    const raw = await readFile(join(profileDir, 'node_modules', 'ds-bot', 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === 'string' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Find the enabled DS-Bot loader row.
 * @param ctx - plugin context.
 * @returns the first enabled `name === 'ds-bot'` entry, when the loader exposes one.
 */
function enabledEntryOf(ctx) {
  const loader = ctx?.loader;
  if (loader === undefined || typeof loader.entries !== 'function') return undefined;
  for (const entry of loader.entries()) {
    if (entry?.options?.name !== 'ds-bot') continue;
    if (entry.disabled !== true) return entry;
  }
  return undefined;
}

/**
 * The configured Bot home. The loader's resolved fiber config wins because a
 * profile patch may replace the whole DS-Bot entry config; `options.config`
 * covers the moment before the fiber attaches.
 */
function configuredHome(entry) {
  const candidates = [entry?.fiber?.config?.home, entry?.options?.config?.home];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return resolve(candidate.trim());
  }
  return undefined;
}

/**
 * Normalize the parts of DS-Bot's state file this plugin uses.
 * @param value - parsed state.
 * @returns bots in insertion order and rooms.
 * @throws {Error} when the file is a shape this adapter does not support.
 */
function readStateShape(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('DS-Bot state is not an object'), { code: 'shape' });
  }
  if (value.version !== 1) {
    throw Object.assign(new Error(`DS-Bot state version ${String(value.version)} is not supported`), { code: 'version' });
  }
  const bots = value.bots;
  if (bots === null || typeof bots !== 'object' || Array.isArray(bots)) {
    throw Object.assign(new Error('DS-Bot state has no Bot table'), { code: 'shape' });
  }
  const rooms = value.rooms;
  if (rooms !== null && rooms !== undefined && (typeof rooms !== 'object' || Array.isArray(rooms))) {
    throw Object.assign(new Error('DS-Bot state has no group table'), { code: 'shape' });
  }
  return { bots, rooms: rooms ?? {} };
}

/**
 * Index every Session that speaks for a Bot.
 *
 * DS-Bot treats a Bot's id as the Session id of its first own-chat segment.
 * The current chat is `sessionId` (falling back to the id), earlier own-chat
 * segments are `bot.segments`, group conversations are `room.sessions[botId]`,
 * and their earlier segments are `room.segments[botId]`.
 * @param state - normalized DS-Bot state.
 * @returns bot table, room table, Session → Bot index, and marker index.
 */
export function indexDsBotSessions(state) {
  const bots = new Map();
  const sessionToBot = new Map();
  const markers = new Map();

  for (const bot of Object.values(state.bots)) {
    if (bot === null || typeof bot !== 'object' || typeof bot.id !== 'string' || bot.id === '') continue;
    bots.set(bot.id, bot);
    const current = typeof bot.sessionId === 'string' && bot.sessionId !== '' ? bot.sessionId : bot.id;
    sessionToBot.set(current, bot.id);
    sessionToBot.set(bot.id, bot.id);
    for (const segment of Array.isArray(bot.segments) ? bot.segments : []) {
      if (typeof segment?.sessionId === 'string' && segment.sessionId !== '') sessionToBot.set(segment.sessionId, bot.id);
    }
    const marker = markerOf(bot.instructions);
    if (marker !== undefined) {
      const list = markers.get(marker) ?? [];
      list.push(bot.id);
      markers.set(marker, list);
    }
  }

  for (const room of Object.values(state.rooms)) {
    if (room === null || typeof room !== 'object') continue;
    if (room.sessions !== null && typeof room.sessions === 'object' && !Array.isArray(room.sessions)) {
      for (const [botId, sessionId] of Object.entries(room.sessions)) {
        if (typeof sessionId === 'string' && sessionId !== '') sessionToBot.set(sessionId, botId);
      }
    }
    if (room.segments !== null && typeof room.segments === 'object' && !Array.isArray(room.segments)) {
      for (const [botId, segments] of Object.entries(room.segments)) {
        for (const segment of Array.isArray(segments) ? segments : []) {
          if (typeof segment?.sessionId === 'string' && segment.sessionId !== '') sessionToBot.set(segment.sessionId, botId);
        }
      }
    }
  }

  return { bots, rooms: state.rooms, sessionToBot, markers };
}

/** The empty team a never-started DS-Bot would serve. */
function emptyState() {
  return { bots: {}, rooms: {} };
}

/**
 * Build the read-only DS-Bot adapter for one host boot.
 * @param ctx - plugin context used to resolve `profileContext` and `loader`.
 * @returns adapter methods used by the role store and the HTTP surface.
 */
export function createDsBotAdapter(ctx) {
  const locate = async () => {
    const profileContext = serviceOf(ctx, 'profileContext') ?? ctx?.profileContext;
    const profileDir = typeof profileContext?.dir === 'string' && profileContext.dir !== '' ? profileContext.dir : undefined;
    if (profileDir === undefined) {
      return { ok: false, reason: 'profile', detail: '宿主没有提供 profileContext.dir' };
    }
    const entry = enabledEntryOf(ctx);
    if (entry === undefined) {
      return { ok: false, reason: 'loader', detail: '没有找到启用的 ds-bot 插件行', profileDir };
    }
    const version = await installedVersion(profileDir);
    if (version === undefined) {
      return { ok: false, reason: 'not-installed', detail: '在 profile 的 node_modules 中读不到 ds-bot/package.json', profileDir };
    }
    if (!SUPPORTED_VERSIONS.includes(version)) {
      return {
        ok: false,
        reason: 'version',
        detail: `支持 DS-Bot ${SUPPORTED_VERSIONS.join('、')}，当前为 ${version}`,
        profileDir,
        version,
      };
    }
    const home = configuredHome(entry) ?? join(dshHomeOf(process.env), 'bot');
    return { ok: true, profileDir, version, home, statePath: join(home, 'state.json'), entryId: entry.options?.id };
  };

  /**
   * Read the latest DS-Bot state.
   * @returns compatibility status plus the Session index when supported.
   */
  const status = async () => {
    const located = await locate();
    if (!located.ok) return located;
    let raw;
    try {
      raw = await readFile(located.statePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return { ...located, ...indexDsBotSessions(emptyState()), loadedAt: Date.now() };
      }
      return {
        ...located,
        ok: false,
        reason: 'state',
        detail: `DS-Bot 状态不可读：${error?.message ?? error}`,
      };
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return {
        ...located,
        ok: false,
        reason: 'state',
        detail: `DS-Bot 状态不是有效 JSON：${error?.message ?? error}`,
      };
    }
    let shape;
    try {
      shape = readStateShape(parsed);
    } catch (error) {
      return {
        ...located,
        ok: false,
        reason: error?.code === 'version' ? 'state-version' : 'state',
        detail: error?.message ?? String(error),
      };
    }
    return { ...located, ...indexDsBotSessions(shape), loadedAt: Date.now() };
  };

  return { status };
}
