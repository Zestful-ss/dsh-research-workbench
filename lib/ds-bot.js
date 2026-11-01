/**
 * Read-only adapter for the DS-Bot plugin.
 *
 * The research workbench never owns Bot names, models, chats, or group chats:
 * DS-Bot does. This module only locates the installed DS-Bot (version, profile
 * directory, Bot home), reads its atomically written `state.json`, and builds
 * the Session → Bot index the skill provider needs. Writes always go through
 * DS-Bot's own same-origin `POST /api/bot` route from the browser half.
 *
 * The adapter checks the saved state format and the Session ownership fields;
 * the installed package version is diagnostic, not a compatibility gate.
 *
 * @module dsh-research-workbench/ds-bot
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidShape(detail) {
  return Object.assign(new Error(`DS-Bot ${detail}格式不受支持`), { code: 'shape' });
}

function validateSegments(segments, owner) {
  if (!Array.isArray(segments) || segments.some(segment =>
    !isRecord(segment) || typeof segment.sessionId !== 'string' || segment.sessionId === '')) {
    throw invalidShape(`${owner}的会话分段`);
  }
}

/**
 * Validate the saved state fields used to associate Sessions with Bots.
 * Additional fields do not affect compatibility.
 * @param value - parsed state.
 * @returns bots in insertion order and rooms.
 * @throws {Error} when Session ownership cannot be read safely.
 */
function readStateShape(value) {
  if (!isRecord(value)) throw invalidShape('状态');
  if (value.version !== 1) {
    throw Object.assign(new Error(`DS-Bot 状态格式版本 ${String(value.version)} 不受支持`), { code: 'version' });
  }
  const bots = value.bots;
  if (!isRecord(bots)) throw invalidShape('助手列表');
  for (const [botId, bot] of Object.entries(bots)) {
    if (!isRecord(bot) || typeof bot.id !== 'string' || bot.id === '' || bot.id !== botId) {
      throw invalidShape('助手标识');
    }
    if (bot.sessionId != null && typeof bot.sessionId !== 'string') throw invalidShape('助手当前会话');
    if (bot.instructions != null && typeof bot.instructions !== 'string') throw invalidShape('助手指令');
    if (bot.segments != null) validateSegments(bot.segments, '助手');
  }
  const rooms = value.rooms;
  if (rooms != null && !isRecord(rooms)) throw invalidShape('群聊列表');
  for (const room of Object.values(rooms ?? {})) {
    if (!isRecord(room)) throw invalidShape('群聊');
    if (room.sessions != null && (!isRecord(room.sessions) ||
      Object.values(room.sessions).some(sessionId => typeof sessionId !== 'string' || sessionId === ''))) {
      throw invalidShape('群聊成员会话');
    }
    if (room.segments != null) {
      if (!isRecord(room.segments)) throw invalidShape('群聊成员会话分段');
      for (const segments of Object.values(room.segments)) validateSegments(segments, '群聊成员');
    }
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
