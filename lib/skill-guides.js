/**
 * Curated plain-language guides for the bundled research skills.
 *
 * The data lives in `skill-guides.json` so the client bundle stays small and
 * the same table can annotate the catalog, the detail dialog, and every role
 * view. A guide is keyed by the CANONICAL source id (the preset id), never by
 * the id a particular installation happens to hold: the same repository can be
 * registered as `science-superpowers-official` when its canonical id is taken.
 *
 * @module dsh-research-workbench/skill-guides
 */

import { readFile } from 'node:fs/promises';

const FILE = new URL('./skill-guides.json', import.meta.url);

/** @type {Map<string, {zh: string[], en: string[], sourceHash?: string}> | undefined} */
let cache;

/**
 * Load the guide table once.
 * @returns every guide keyed by `<canonicalSourceId>/<name>`.
 */
export async function loadSkillGuides() {
  if (cache !== undefined) return cache;
  let parsed;
  try {
    parsed = JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    parsed = undefined;
  }
  const table = new Map();
  const guides = parsed?.guides;
  if (guides !== null && typeof guides === 'object' && !Array.isArray(guides)) {
    for (const [key, value] of Object.entries(guides)) {
      const guide = normalizeGuide(value);
      if (guide !== undefined) table.set(key, guide);
    }
  }
  cache = table;
  return cache;
}

function normalizeGuide(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const zh = normalizeTexts(value.zh);
  const en = normalizeTexts(value.en);
  if (zh === undefined || en === undefined) return undefined;
  return {
    zh,
    en,
    ...(typeof value.sourceHash === 'string' && /^[a-f0-9]{64}$/.test(value.sourceHash) ? { sourceHash: value.sourceHash } : {}),
  };
}

function normalizeTexts(value) {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  if (value.some(entry => typeof entry !== 'string' || entry.trim() === '')) return undefined;
  return value.map(entry => entry.trim());
}

/**
 * Attach one row's guide, marking a guide whose upstream text has moved.
 * @param guides - loaded table.
 * @param row - scanned skill row (`canonicalSourceId`, `sourceId`, `name`).
 * @returns `{ zh, en, stale }`, or `undefined` when nobody curated this skill.
 */
export function guideFor(guides, row) {
  const guide = guides.get(`${row.canonicalSourceId ?? row.sourceId}/${row.name}`)
    ?? guides.get(`${row.sourceId}/${row.name}`);
  if (guide === undefined) return undefined;
  const stale = guide.sourceHash !== undefined && typeof row.sourceHash === 'string' && row.sourceHash !== guide.sourceHash;
  return {
    zh: guide.zh,
    en: guide.en,
    stale: stale === true,
  };
}
