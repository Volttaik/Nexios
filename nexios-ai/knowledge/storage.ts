import fs from 'fs';
import path from 'path';
import type { KnowledgeEntry, KnowledgeQuery, KnowledgeResult, KnowledgeCategory } from '../types/index';

const DATA_DIR = path.join(process.cwd(), 'data', 'nexios-ai');
const KB_FILE = path.join(DATA_DIR, 'knowledge-base.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load(): KnowledgeEntry[] {
  ensureDir();
  if (!fs.existsSync(KB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(KB_FILE, 'utf-8')); } catch { return []; }
}

function save(entries: KnowledgeEntry[]) {
  ensureDir();
  fs.writeFileSync(KB_FILE, JSON.stringify(entries, null, 2));
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set(['the','a','an','is','in','it','of','to','and','or','for','on','at','by','with','that','this','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','from','as','but','not','so','if','then','than','more','also','about','can','just','up','out','into','over','after','before','all','when','what','how','which','who','we','you','i','my','your','our','its','their','them','they','he','she','his','her']);
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w))
  )].slice(0, 40);
}

function scoreEntry(entry: KnowledgeEntry, queryKeywords: string[], categoryFilter?: KnowledgeCategory): number {
  if (categoryFilter && entry.category !== categoryFilter) return 0;
  const entryKws = new Set(entry.keywords);
  const matches = queryKeywords.filter(k => entryKws.has(k) || entry.content.toLowerCase().includes(k));
  const overlap = matches.length / Math.max(queryKeywords.length, 1);
  return overlap * entry.confidence;
}

export class KnowledgeStorage {
  private entries: KnowledgeEntry[] = [];
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.entries = load();
    console.log(`[KnowledgeStorage] Loaded ${this.entries.length} entries`);
  }

  store(params: {
    content: string;
    category: KnowledgeCategory;
    source: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): KnowledgeEntry {
    const entry: KnowledgeEntry = {
      id: `ke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: params.content.slice(0, 8000),
      category: params.category,
      source: params.source,
      timestamp: Date.now(),
      confidence: params.confidence ?? 0.7,
      keywords: extractKeywords(params.content),
      metadata: params.metadata,
    };
    this.entries.push(entry);
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
      if (item.content && item.content.trim().length > 30) {
        this.store(item);
        added++;
      }
    }
    return added;
  }

  query(query: KnowledgeQuery): KnowledgeResult[] {
    const keywords = extractKeywords(query.text);
    const minConf = query.minConfidence ?? 0;
    const limit = query.limit ?? 8;

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

  count(): number { return this.entries.length; }
  countByCategory(): Record<string, number> {
    return this.entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    save(this.entries);
    this.dirty = false;
  }

  private scheduleSave() {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      save(this.entries);
      this.dirty = false;
    }, 2000);
  }
}

let instance: KnowledgeStorage | null = null;
export function getStorage(): KnowledgeStorage {
  if (!instance) instance = new KnowledgeStorage();
  return instance;
}
