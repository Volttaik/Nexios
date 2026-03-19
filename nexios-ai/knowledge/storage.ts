import fs from 'fs';
import path from 'path';
import type { KnowledgeEntry, KnowledgeQuery, KnowledgeResult, KnowledgeCategory } from '../types/index';

const DATA_DIR = path.join(process.cwd(), 'data', 'nexios-ai');
const KB_FILE  = path.join(DATA_DIR, 'knowledge-base.json');
const BAK_FILE = path.join(DATA_DIR, 'knowledge-base.backup.json');
const ERR_LOG  = path.join(DATA_DIR, 'errors.log');

const MAX_ENTRIES = 100_000;
const WARN_THRESHOLD = 0.85;

/* ── Directory bootstrap ──────────────────────────────────────────────── */
function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[KnowledgeStorage] Created data directory: ${DATA_DIR}`);
    appendErrorLog(`INFO: Data directory created at ${DATA_DIR}`);
  }
}

function appendErrorLog(msg: string): void {
  try {
    ensureDir();
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(ERR_LOG, line);
  } catch { /* never let error logging crash the system */ }
}

/* ── Persistence ──────────────────────────────────────────────────────── */
function load(): KnowledgeEntry[] {
  ensureDir();
  if (!fs.existsSync(KB_FILE)) return [];
  try {
    const raw = fs.readFileSync(KB_FILE, 'utf-8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      appendErrorLog('WARN: knowledge-base.json was not an array — resetting to empty');
      return [];
    }
    return parsed;
  } catch (e) {
    appendErrorLog(`ERROR: Failed to parse knowledge-base.json: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function save(entries: KnowledgeEntry[]): void {
  ensureDir();
  try {
    fs.writeFileSync(KB_FILE, JSON.stringify(entries, null, 2));
  } catch (e) {
    appendErrorLog(`ERROR: Failed to save knowledge-base.json: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

/* ── Keyword extraction ───────────────────────────────────────────────── */
const STOPWORDS = new Set([
  'the','a','an','is','in','it','of','to','and','or','for','on','at','by','with',
  'that','this','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','from','as','but','not','so','if',
  'then','than','more','also','about','can','just','up','out','into','over','after',
  'before','all','when','what','how','which','who','we','you','i','my','your','our',
  'its','their','them','they','he','she','his','her','each','any','some','use','used',
]);

function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  )].slice(0, 40);
}

/* ── Scoring ──────────────────────────────────────────────────────────── */
function scoreEntry(entry: KnowledgeEntry, queryKeywords: string[], categoryFilter?: KnowledgeCategory): number {
  if (categoryFilter && entry.category !== categoryFilter) return 0;
  const entryKws = new Set(entry.keywords);
  const matches  = queryKeywords.filter(k => entryKws.has(k) || entry.content.toLowerCase().includes(k));
  const overlap  = matches.length / Math.max(queryKeywords.length, 1);
  return overlap * entry.confidence;
}

/* ── Main class ───────────────────────────────────────────────────────── */
export class KnowledgeStorage {
  private entries: KnowledgeEntry[] = [];
  private dirty    = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private warnedLimit = false;

  constructor() {
    this.entries = load();
    console.log(`[KnowledgeStorage] Loaded ${this.entries.length} entries from ${KB_FILE}`);
    this.checkStorageLimit();
  }

  /* ── Storage limit ──────────────────────────────────────────────────── */
  private checkStorageLimit(): void {
    const ratio = this.entries.length / MAX_ENTRIES;
    if (ratio >= WARN_THRESHOLD && !this.warnedLimit) {
      const pct = (ratio * 100).toFixed(1);
      const msg = `WARN: Knowledge base at ${pct}% capacity (${this.entries.length}/${MAX_ENTRIES}). Consider running Self-Improving Agent to deduplicate.`;
      console.warn(`[KnowledgeStorage] ${msg}`);
      appendErrorLog(msg);
      this.warnedLimit = true;
    }
    if (ratio < WARN_THRESHOLD) this.warnedLimit = false;
  }

  isNearLimit(): boolean {
    return this.entries.length / MAX_ENTRIES >= WARN_THRESHOLD;
  }

  isFull(): boolean {
    return this.entries.length >= MAX_ENTRIES;
  }

  /* ── Write operations ───────────────────────────────────────────────── */
  store(params: {
    content: string;
    category: KnowledgeCategory;
    source: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): KnowledgeEntry {
    if (this.isFull()) {
      const msg = `ERROR: Knowledge base full (${MAX_ENTRIES} entries). Cannot store new entry.`;
      appendErrorLog(msg);
      throw new Error(msg);
    }

    const entry: KnowledgeEntry = {
      id:         `ke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content:    params.content.slice(0, 8000),
      category:   params.category,
      source:     params.source,
      timestamp:  Date.now(),
      confidence: params.confidence ?? 0.7,
      keywords:   extractKeywords(params.content),
      metadata:   params.metadata,
    };
    this.entries.push(entry);
    this.checkStorageLimit();
    this.scheduleSave();
    return entry;
  }

  storeMany(items: Array<{
    content: string;
    category: KnowledgeCategory;
    source: string;
    confidence?: number;
  }>): number {
    let added = 0;
    for (const item of items) {
      if (this.isFull()) {
        const msg = `WARN: Knowledge base full — stopping storeMany after ${added} items`;
        appendErrorLog(msg);
        console.warn(`[KnowledgeStorage] ${msg}`);
        break;
      }
      try {
        if (item.content && item.content.trim().length > 30) {
          this.store(item);
          added++;
        }
      } catch (e) {
        appendErrorLog(`ERROR in storeMany: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return added;
  }

  /** Remove a single entry by ID. Returns true if removed. */
  remove(id: string): boolean {
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.id !== id);
    const removed = this.entries.length < before;
    if (removed) this.scheduleSave();
    return removed;
  }

  /** Remove multiple entries by ID. Returns count removed. */
  removeMany(ids: string[]): number {
    const idSet = new Set(ids);
    const before = this.entries.length;
    this.entries = this.entries.filter(e => !idSet.has(e.id));
    const removed = before - this.entries.length;
    if (removed > 0) this.scheduleSave();
    return removed;
  }

  /** Replace an existing entry (for confidence updates / keyword refresh). */
  update(id: string, patch: Partial<Pick<KnowledgeEntry, 'confidence' | 'keywords' | 'metadata'>>): boolean {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return false;
    if (patch.confidence !== undefined) entry.confidence = patch.confidence;
    if (patch.keywords   !== undefined) entry.keywords   = patch.keywords;
    if (patch.metadata   !== undefined) entry.metadata   = { ...entry.metadata, ...patch.metadata };
    this.scheduleSave();
    return true;
  }

  /* ── Backup ─────────────────────────────────────────────────────────── */
  backup(): void {
    ensureDir();
    try {
      if (fs.existsSync(KB_FILE)) {
        fs.copyFileSync(KB_FILE, BAK_FILE);
        console.log(`[KnowledgeStorage] Backup created: ${BAK_FILE}`);
      }
    } catch (e) {
      appendErrorLog(`ERROR: Backup failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  restoreBackup(): boolean {
    try {
      if (!fs.existsSync(BAK_FILE)) return false;
      fs.copyFileSync(BAK_FILE, KB_FILE);
      this.entries = load();
      console.log(`[KnowledgeStorage] Restored from backup — ${this.entries.length} entries`);
      return true;
    } catch (e) {
      appendErrorLog(`ERROR: Restore from backup failed: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  /* ── Read operations ────────────────────────────────────────────────── */
  query(query: KnowledgeQuery): KnowledgeResult[] {
    const keywords = extractKeywords(query.text);
    const minConf  = query.minConfidence ?? 0;
    const limit    = query.limit ?? 8;

    return this.entries
      .filter(e => e.confidence >= minConf)
      .map(e => ({ entry: e, score: scoreEntry(e, keywords, query.category) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getByCategory(category: KnowledgeCategory, limit = 20): KnowledgeEntry[] {
    return this.entries
      .filter(e => e.category === category)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAll(limit = 1000): KnowledgeEntry[] {
    return this.entries.slice(-limit);
  }

  count(): number { return this.entries.length; }

  countByCategory(): Record<string, number> {
    return this.entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  storageStats(): { entries: number; maxEntries: number; usagePercent: number; nearLimit: boolean } {
    const usagePercent = Math.round((this.entries.length / MAX_ENTRIES) * 100);
    return {
      entries: this.entries.length,
      maxEntries: MAX_ENTRIES,
      usagePercent,
      nearLimit: this.isNearLimit(),
    };
  }

  /* ── Flush / schedule save ──────────────────────────────────────────── */
  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    try {
      save(this.entries);
      this.dirty = false;
    } catch (e) {
      appendErrorLog(`ERROR: flush() save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        save(this.entries);
        this.dirty = false;
      } catch (e) {
        appendErrorLog(`ERROR: Scheduled save failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, 2000);
  }
}

let instance: KnowledgeStorage | null = null;
export function getStorage(): KnowledgeStorage {
  if (!instance) instance = new KnowledgeStorage();
  return instance;
}
