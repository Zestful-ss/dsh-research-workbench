/**
 * Research roles: which workbench skills belong to which DS-Bot, stored apart
 * from DS-Bot's own team file.
 *
 * `roles.json` is the only file this module owns:
 *
 *     {
 *       version: 1,
 *       pending: { [transactionId]: { templateId, name, skills, createdAt } },
 *       roles:   { [botId]:         { templateId, skills, createdAt } }
 *     }
 *
 * Bot names, models, chats, and groups stay in DS-Bot. The skill source
 * registry and its enable/disable flags stay in the workbench's own
 * `state.json`. A role only binds a Bot id to a template and a skill list.
 *
 * @module dsh-research-workbench/research-roles
 */

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SKILL_NAME, SkillError, acquireInstallLock, writeJsonAtomic } from './skill-sources.js';
import { SUPPORTED_VERSION, createDsBotAdapter, isTransactionId, markerOf } from './ds-bot.js';

/** Role file schema version. */
export const ROLE_VERSION = 1;
/** File name under the workbench data root. */
export const ROLE_FILE = 'roles.json';
/** Separate lock so a role edit never waits on a multi-minute source install. */
export const ROLE_LOCK = 'roles.lock';
/** Upper bound on one role's selected skills. */
export const MAX_ROLE_SKILLS = 64;
/** Upper bound on simultaneously unfinished creations. */
export const MAX_PENDING_ROLES = 32;

const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * Read-only role presets. The client translates `labelKey` / `purposeKey`;
 * only `id` and `skills` cross the API as authority.
 */
export const ROLE_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'literature-search',
    labelKey: 'roleLiterature',
    purposeKey: 'roleLiteratureHint',
    skills: Object.freeze([
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-academic-search' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-citation' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-downloader' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-literature-pipeline' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-ref-verifier' }),
    ]),
  }),
  Object.freeze({
    id: 'paper-reading',
    labelKey: 'roleReading',
    purposeKey: 'roleReadingHint',
    skills: Object.freeze([
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-reader' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper-xray' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper-card' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper-trans' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper2ppt' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper2word' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-paper-to-patent' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-image2ppt' }),
    ]),
  }),
  Object.freeze({
    id: 'paper-writing',
    labelKey: 'roleWriting',
    purposeKey: 'roleWritingHint',
    skills: Object.freeze([
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-writing' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-polishing' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-proposal-writer' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-social-science' }),
    ]),
  }),
  Object.freeze({
    id: 'peer-review',
    labelKey: 'roleReview',
    purposeKey: 'roleReviewHint',
    skills: Object.freeze([
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-reviewer' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-response' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-statistics' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-data' }),
    ]),
  }),
  Object.freeze({
    id: 'research-figure',
    labelKey: 'roleFigure',
    purposeKey: 'roleFigureHint',
    skills: Object.freeze([
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-figure' }),
      Object.freeze({ sourceId: 'figures4papers', name: 'scientific-figure-making' }),
      Object.freeze({ sourceId: 'nature-skills', name: 'nature-experiment-log' }),
    ]),
  }),
]);

/** Template ids retired by the five-category consolidation; read as their successor. */
export const LEGACY_TEMPLATE_IDS = Object.freeze({
  'statistics-review': 'peer-review',
  'data-availability': 'peer-review',
  'paper-presentation': 'paper-reading',
  'translation-polish': 'paper-writing',
});

const TEMPLATE_BY_ID = new Map(ROLE_TEMPLATES.map(template => [template.id, template]));

/** Resolve a stored template id, following the consolidation aliases. */
function templateForRead(templateId) {
  const resolved = LEGACY_TEMPLATE_IDS[templateId] ?? templateId;
  return TEMPLATE_BY_ID.get(resolved);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(table, key) {
  return table !== null && typeof table === 'object' && Object.hasOwn(table, key) ? table[key] : undefined;
}

/**
 * Validate and copy one `{ sourceId, name }` selection.
 * @param value - untrusted entry.
 * @returns the normalized key, or `undefined` when malformed.
 */
export function normalizeSkillKey(value) {
  if (!isRecord(value)) return undefined;
  const { sourceId, name } = value;
  if (typeof sourceId !== 'string' || !SOURCE_ID.test(sourceId)) return undefined;
  if (typeof name !== 'string' || !SKILL_NAME.test(name)) return undefined;
  return { sourceId, name };
}

/**
 * Validate, deduplicate, and order a complete skill selection.
 * @param value - untrusted selection.
 * @returns keys in the caller's order.
 * @throws {SkillError} on a malformed or oversized selection.
 */
export function normalizeSelection(value) {
  if (!Array.isArray(value)) throw new SkillError('技能列表格式不正确', 'invalid');
  if (value.length > MAX_ROLE_SKILLS) throw new SkillError(`一个角色最多选择 ${MAX_ROLE_SKILLS} 个技能`, 'invalid');
  const seen = new Set();
  const out = [];
  for (const entry of value) {
    const key = normalizeSkillKey(entry);
    if (key === undefined) throw new SkillError('技能键无效，需要 sourceId 与 kebab-case 名称', 'invalid');
    const id = `${key.sourceId}/${key.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(key);
  }
  return out;
}

/**
 * A name DS-Bot accepts and a person can recognize.
 * @param value - untrusted name.
 * @returns trimmed name.
 * @throws {SkillError} when empty, too long, or containing line breaks.
 */
function normalizeName(value) {
  if (typeof value !== 'string') throw new SkillError('需要助手名称', 'invalid');
  const name = value.trim();
  if (name === '' || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new SkillError('助手名称需要 1–40 个字符且不能换行', 'invalid');
  }
  return name;
}

function requireTemplate(templateId) {
  if (typeof templateId !== 'string') throw new SkillError('需要模板', 'invalid');
  const template = TEMPLATE_BY_ID.get(templateId);
  if (template === undefined) throw new SkillError(`未知的科研模板：${templateId}`, 'not_found');
  return template;
}

function emptyRoles() {
  return { version: ROLE_VERSION, pending: {}, roles: {} };
}

/**
 * Read and strictly validate `roles.json`.
 * @param file - absolute path.
 * @returns normalized role state; an absent file is the empty state.
 * @throws {SkillError} with code `corrupt` when the file exists but cannot be used.
 */
export async function readRoleFile(file) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyRoles();
    throw new SkillError(`角色配置不可读：${error?.message ?? error}`, 'corrupt');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SkillError(`角色配置不是有效 JSON：${error?.message ?? error}`, 'corrupt');
  }
  if (!isRecord(parsed)) throw new SkillError('角色配置不是对象', 'corrupt');
  if (parsed.version !== ROLE_VERSION) {
    throw new SkillError(`角色配置版本 ${String(parsed.version)} 不受支持`, 'corrupt');
  }
  const pending = parsed.pending === undefined ? {} : parsed.pending;
  const roles = parsed.roles === undefined ? {} : parsed.roles;
  if (!isRecord(pending) || !isRecord(roles)) throw new SkillError('角色配置缺少 pending/roles 表', 'corrupt');

  const result = emptyRoles();
  for (const [transactionId, entry] of Object.entries(pending)) {
    if (!isTransactionId(transactionId)) throw new SkillError(`角色配置含无效事务：${transactionId}`, 'corrupt');
    if (!isRecord(entry)) throw new SkillError('角色配置含无效待创建记录', 'corrupt');
    try {
      const template = templateForRead(entry.templateId);
      if (template === undefined) throw new SkillError(`未知的科研模板：${entry.templateId}`, 'not_found');
      const name = normalizeName(entry.name);
      const skills = normalizeSelection(entry.skills);
      result.pending[transactionId] = {
        templateId: template.id,
        name,
        skills,
        ...(typeof entry.createdAt === 'string' ? { createdAt: entry.createdAt } : {}),
      };
    } catch (error) {
      throw new SkillError(`待创建角色配置损坏：${error?.message ?? error}`, 'corrupt');
    }
  }
  for (const [botId, entry] of Object.entries(roles)) {
    if (botId === '' || botId.length > 200 || botId === '__proto__' || botId === 'constructor' || botId === 'prototype') {
      throw new SkillError('角色配置含无效 Bot id', 'corrupt');
    }
    if (!isRecord(entry)) throw new SkillError(`角色 ${botId} 的记录损坏`, 'corrupt');
    try {
      const template = templateForRead(entry.templateId);
      if (template === undefined) throw new SkillError(`未知的科研模板：${entry.templateId}`, 'not_found');
      const skills = normalizeSelection(entry.skills);
      result.roles[botId] = {
        templateId: template.id,
        skills,
        ...(typeof entry.createdAt === 'string' ? { createdAt: entry.createdAt } : {}),
      };
    } catch (error) {
      throw new SkillError(`角色 ${botId} 的记录损坏：${error?.message ?? error}`, 'corrupt');
    }
  }
  return result;
}

/** One selection's view against a scan, without any global shadowing rule. */
/**
 * Evaluate selected `(sourceId, name)` keys against scanned rows.
 *
 * A key is usable only when exactly one row carries it, that row is enabled,
 * and no other selected source offers the same skill name. Global
 * `shadowedBy` is deliberately ignored: the role's own selection decides.
 * @param rows - `manager.scanSkills()` output.
 * @param selected - normalized selection.
 * @returns per-key entries plus the conflicts the operator must resolve.
 */
export function evaluateSelection(rows, selected) {
  const byKey = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = `${row.sourceId}/${row.name}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const nameSources = new Map();
  for (const key of selected) {
    const sources = nameSources.get(key.name) ?? new Set();
    sources.add(key.sourceId);
    nameSources.set(key.name, sources);
  }

  const entries = [];
  const conflicts = [];
  for (const key of selected) {
    const id = `${key.sourceId}/${key.name}`;
    const found = byKey.get(id) ?? [];
    const crossSource = (nameSources.get(key.name)?.size ?? 0) > 1;
    const duplicatePath = found.length > 1;
    const disabled = found.length > 0 && found.every(row => row.disabled === true);
    const conflict = crossSource || duplicatePath;
    let reason;
    if (found.length === 0) reason = 'missing';
    else if (duplicatePath) reason = 'duplicate';
    else if (crossSource) reason = 'conflict';
    else if (disabled) reason = 'disabled';
    entries.push({
      key: id,
      sourceId: key.sourceId,
      name: key.name,
      rows: found,
      available: found.length === 1 && !disabled && !conflict,
      disabled,
      conflict,
      duplicatePath,
      reason,
    });
    if (duplicatePath) {
      conflicts.push({ name: key.name, keys: [id], kind: 'duplicate-path' });
    }
  }
  for (const [name, sources] of nameSources) {
    if (sources.size < 2) continue;
    conflicts.push({
      name,
      keys: selected.filter(key => key.name === name).map(key => `${key.sourceId}/${key.name}`),
      kind: 'cross-source',
    });
  }
  return { entries, conflicts };
}

/**
 * The role store: reads, transactional writes, and the Session → role lookup
 * the per-Agent skill provider calls.
 */
export class ResearchRoleStore {
  dataRoot;
  file;
  lockFile;
  manager;
  log;
  adapter;
  listeners = new Set();

  /**
   * @param options - workbench data root, skill manager, logger, and an optional
   *   DS-Bot adapter (tests inject one).
   */
  constructor({ dataRoot, manager, log, ctx, adapter } = {}) {
    if (typeof dataRoot !== 'string' || dataRoot === '') throw new TypeError('research-roles: dataRoot is required');
    if (manager === undefined) throw new TypeError('research-roles: manager is required');
    this.dataRoot = dataRoot;
    this.file = join(dataRoot, ROLE_FILE);
    this.lockFile = join(dataRoot, ROLE_LOCK);
    this.manager = manager;
    this.log = log ?? { warn() {}, info() {} };
    this.adapter = adapter ?? createDsBotAdapter(ctx);
  }

  /** Subscribe to role changes. */
  onChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        this.log.warn?.(`research-workbench: role listener failed: ${error?.message ?? error}`);
      }
    }
  }

  /** Read the current role state. */
  async read() {
    return await readRoleFile(this.file);
  }

  /**
   * Take the role lock, re-read the file, mutate, write atomically.
   * @param mutator - receives the freshly read state and returns the API value.
   */
  async update(mutator) {
    const release = await acquireInstallLock(this.lockFile);
    try {
      const state = await readRoleFile(this.file);
      const value = await mutator(state);
      await writeJsonAtomic(this.file, state);
      this.notify();
      return value;
    } finally {
      await release();
    }
  }

  /** Whether any role or pending creation exists, so normal Agents can skip DS-Bot state reads. */
  async hasAny() {
    const state = await this.read();
    return Object.keys(state.roles).length > 0 || Object.keys(state.pending).length > 0;
  }

  /** Whether a creation is waiting for its Bot. */
  async hasPending() {
    try {
      return Object.keys((await this.read()).pending).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate a creation request and persist its pending transaction.
   * @param request - template id, name, and selected skills.
   * @returns the transaction id and its pending record.
   */
  async prepare({ templateId, name, skills } = {}) {
    const template = requireTemplate(templateId);
    const cleanName = normalizeName(name);
    const selection = normalizeSelection(skills);
    const rows = await this.manager.scanSkills();
    const known = new Set(rows.map(row => `${row.sourceId}/${row.name}`));
    for (const key of selection) {
      const id = `${key.sourceId}/${key.name}`;
      if (!known.has(id)) throw new SkillError(`技能当前不可用：${id}`, 'invalid');
    }
    return await this.update((state) => {
      if (Object.keys(state.pending).length >= MAX_PENDING_ROLES) {
        throw new SkillError('待创建的科研助手过多，请先处理未完成项', 'limit_exceeded');
      }
      const transactionId = randomUUID();
      state.pending[transactionId] = {
        templateId: template.id,
        name: cleanName,
        skills: selection,
        createdAt: new Date().toISOString(),
      };
      return { transactionId, pending: { ...state.pending[transactionId] } };
    });
  }

  /**
   * Move a pending transaction onto the Bot DS-Bot just created.
   * @param request - transaction id and Bot id.
   * @returns the stored role.
   */
  async complete({ transactionId, botId } = {}) {
    if (!isTransactionId(transactionId)) throw new SkillError('创建事务无效', 'invalid');
    if (typeof botId !== 'string' || botId === '' || botId === '__proto__' || botId === 'constructor' || botId === 'prototype') {
      throw new SkillError('需要 Bot id', 'invalid');
    }
    const ds = await this.adapter.status();
    if (!ds.ok) throw new SkillError(`DS-Bot 不可用：${ds.detail ?? ds.reason}`, 'unsupported');
    const bot = ds.bots.get(botId);
    if (bot === undefined) throw new SkillError('DS-Bot 中不存在该 Bot', 'not_found');
    const marker = markerOf(bot.instructions);
    if (marker !== transactionId) throw new SkillError('该 Bot 不属于这个创建事务', 'invalid');
    return await this.update((state) => {
      const pending = own(state.pending, transactionId);
      if (pending === undefined) throw new SkillError('创建事务已结束或不存在', 'not_found');
      if (own(state.roles, botId) !== undefined) throw new SkillError('该 Bot 已有科研角色', 'duplicate');
      delete state.pending[transactionId];
      state.roles[botId] = {
        templateId: pending.templateId,
        skills: pending.skills,
        createdAt: new Date().toISOString(),
      };
      return { botId, role: { ...state.roles[botId] } };
    });
  }

  /**
   * Drop a pending transaction only when DS-Bot really has no Bot carrying it.
   * @param request - transaction id.
   */
  async cancel({ transactionId } = {}) {
    if (!isTransactionId(transactionId)) throw new SkillError('创建事务无效', 'invalid');
    const ds = await this.adapter.status();
    if (!ds.ok) throw new SkillError(`DS-Bot 不可用：${ds.detail ?? ds.reason}`, 'unsupported');
    for (const bot of ds.bots.values()) {
      if (markerOf(bot.instructions) === transactionId) {
        throw new SkillError('DS-Bot 已有匹配的 Bot，请完成该科研助手', 'conflict');
      }
    }
    return await this.update((state) => {
      if (own(state.pending, transactionId) === undefined) return { cancelled: false };
      delete state.pending[transactionId];
      return { cancelled: true };
    });
  }

  /**
   * Replace one registered role's skills.
   *
   * Keys already on the role survive even when their source was removed or
   * their skill was disabled: the operator keeps the selection and decides.
   * Newly added keys must resolve in the current scan.
   * @param request - Bot id and complete selection.
   */
  async setSkills({ botId, skills } = {}) {
    if (typeof botId !== 'string' || botId === '') throw new SkillError('需要 Bot id', 'invalid');
    const current = own((await this.read()).roles, botId);
    if (current === undefined) throw new SkillError('该 Bot 不是科研助手', 'not_found');
    const selection = normalizeSelection(skills);
    const rows = await this.manager.scanSkills();
    const known = new Set(rows.map(row => `${row.sourceId}/${row.name}`));
    const previous = new Set(current.skills.map(key => `${key.sourceId}/${key.name}`));
    for (const key of selection) {
      const id = `${key.sourceId}/${key.name}`;
      if (!known.has(id) && !previous.has(id)) throw new SkillError(`技能当前不可用：${id}`, 'invalid');
    }
    return await this.update((state) => {
      const role = own(state.roles, botId);
      if (role === undefined) throw new SkillError('该 Bot 不是科研助手', 'not_found');
      role.skills = selection;
      return { botId, role: { ...role } };
    });
  }

  /**
   * Remove the research role without touching DS-Bot.
   * @param request - Bot id.
   */
  async remove({ botId } = {}) {
    if (typeof botId !== 'string' || botId === '') throw new SkillError('需要 Bot id', 'invalid');
    return await this.update((state) => {
      if (own(state.roles, botId) === undefined) throw new SkillError('该 Bot 不是科研助手', 'not_found');
      delete state.roles[botId];
      return { botId, removed: true };
    });
  }

  /**
   * Resolve one live Session to its research role.
   *
   * This reads DS-Bot's state on every call on purpose: DS-Bot saves a group
   * member's or a fresh segment's ownership before the turn that uses it.
   * @param sessionId - live Agent / Session id.
   * @returns role resolution, `none`, or an availability failure.
   */
  async resolveSession(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return { status: 'none' };
    const ds = await this.adapter.status();
    if (!ds.ok) {
      return { status: 'unavailable', reason: ds.reason, detail: ds.detail, version: ds.version };
    }
    let roles;
    try {
      roles = await this.read();
    } catch (error) {
      return { status: 'error', detail: error?.message ?? String(error) };
    }
    const botId = ds.sessionToBot.get(sessionId);
    if (botId === undefined) return { status: 'none' };
    const role = own(roles.roles, botId);
    if (role !== undefined) {
      return { status: 'role', via: 'role', botId, templateId: role.templateId, skills: role.skills };
    }
    const bot = ds.bots.get(botId);
    const transactionId = markerOf(bot?.instructions);
    if (transactionId !== undefined) {
      const pending = own(roles.pending, transactionId);
      if (pending !== undefined) {
        return {
          status: 'role',
          via: 'pending',
          botId,
          templateId: pending.templateId,
          skills: pending.skills,
          transactionId,
        };
      }
    }
    return { status: 'none', botId, botSession: true };
  }

  /**
   * The entire role surface for bootstrap and after every mutation.
   * @returns templates, registered roles, pending creations, and compatibility.
   */
  async view() {
    const ds = await this.adapter.status();
    let roles;
    let rolesError;
    try {
      roles = await this.read();
    } catch (error) {
      rolesError = error?.message ?? String(error);
    }
    let catalog;
    let catalogError;
    try {
      catalog = await this.manager.status();
    } catch (error) {
      catalogError = error?.message ?? String(error);
    }
    const templates = ROLE_TEMPLATES.map(template => ({
      id: template.id,
      labelKey: template.labelKey,
      purposeKey: template.purposeKey,
      skills: template.skills.map(key => ({ ...key })),
    }));
    const base = {
      compatible: ds.ok === true && rolesError === undefined && catalogError === undefined,
      reason: rolesError !== undefined ? 'roles' : (ds.ok !== true ? ds.reason : (catalogError !== undefined ? 'catalog' : null)),
      error: rolesError ?? catalogError ?? (ds.ok === true ? null : (ds.detail ?? ds.reason ?? 'DS-Bot 不可用')),
      templates,
      dsBot: {
        ok: ds.ok === true,
        version: ds.version ?? null,
        supportedVersion: SUPPORTED_VERSION,
        statePath: ds.statePath ?? null,
        home: ds.home ?? null,
        reason: ds.reason ?? null,
        detail: ds.detail ?? null,
      },
      entries: [],
      pending: [],
    };
    if (roles === undefined) return base;

    const sources = new Map((catalog?.sources ?? []).map(source => [source.id, source]));
    const enrich = (selection) => {
      const evaluation = evaluateSelection(catalog?.skills ?? [], selection);
      return {
        skills: evaluation.entries.map(entry => {
          const row = entry.rows[0];
          const sourceMissing = !sources.has(entry.sourceId);
          let reason = entry.reason;
          if (sourceMissing) reason = 'source-missing';
          return {
            sourceId: entry.sourceId,
            name: entry.name,
            key: entry.key,
            sourceTitle: row?.sourceTitle ?? sources.get(entry.sourceId)?.title ?? entry.sourceId,
            category: row?.category ?? 'general',
            available: entry.available && !sourceMissing,
            disabled: entry.disabled,
            conflict: entry.conflict,
            duplicatePath: entry.duplicatePath,
            ...(reason === undefined ? {} : { reason }),
          };
        }),
        conflicts: evaluation.conflicts,
      };
    };

    base.entries = Object.entries(roles.roles).map(([botId, role]) => {
      const bot = ds.ok === true ? ds.bots.get(botId) : undefined;
      const currentSessionId = bot === undefined
        ? undefined
        : (typeof bot.sessionId === 'string' && bot.sessionId !== '' ? bot.sessionId : bot.id);
      const skills = enrich(role.skills);
      return {
        botId,
        name: typeof bot?.name === 'string' ? bot.name : null,
        role: typeof bot?.role === 'string' ? bot.role : null,
        model: typeof bot?.model === 'string' ? bot.model : null,
        workDir: typeof bot?.workDir === 'string' ? bot.workDir : null,
        sessionId: currentSessionId ?? null,
        missing: bot === undefined,
        templateId: role.templateId,
        createdAt: role.createdAt ?? null,
        skills: skills.skills,
        conflicts: skills.conflicts,
      };
    });
    base.pending = Object.entries(roles.pending).map(([transactionId, pending]) => {
      const matchedBotIds = ds.ok === true ? (ds.markers.get(transactionId) ?? []) : [];
      const skills = enrich(pending.skills);
      return {
        transactionId,
        templateId: pending.templateId,
        name: pending.name,
        createdAt: pending.createdAt ?? null,
        matchedBotIds,
        skills: skills.skills,
        conflicts: skills.conflicts,
      };
    });
    return base;
  }
}

/** Construct the store from the plugin's data root. */
export function createRoleStore(options) {
  return new ResearchRoleStore(options);
}
