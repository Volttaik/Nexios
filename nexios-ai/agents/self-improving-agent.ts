import type { AgentStatus } from '../types/index';
import { getStorage } from '../knowledge/storage';

const LOG_LIMIT = 100;
const BATCH_SIZE = 500;
const DEDUP_SIMILARITY_THRESHOLD = 0.72;

/* ── Similarity helpers ───────────────────────────────────────────────── */
function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const intersection = [...sa].filter(k => sb.has(k)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : intersection / union;
}

function contentFingerprint(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/* ── Metrics for a cycle ──────────────────────────────────────────────── */
interface CycleMetrics {
  itemsProcessed: number;
  itemsAdded: number;
  itemsRemoved: number;
  totalKnowledge: number;
  nearDuplicatesFound: number;
  staleFound: number;
  highSimilarityPairs: number;
  errors: number;
}

/* ── Main class ───────────────────────────────────────────────────────── */
export class SelfImprovingAgent {
  private status: AgentStatus = {
    name: 'self-improving',
    state: 'idle',
    cyclesCompleted: 0,
    itemsProcessed: 0,
    lastRunAt: null,
    nextRunAt: null,
    currentTask: null,
    errors: 0,
    log: [],
  };

  private lastCodingCycleCount = 0;

  getStatus(): AgentStatus {
    return { ...this.status, log: [...this.status.log] };
  }

  /**
   * Only run if the Coding Agent has completed at least one new cycle
   * since the last Self-Improving run.
   */
  shouldRun(codingCyclesCompleted: number): boolean {
    return codingCyclesCompleted > this.lastCodingCycleCount;
  }

  async runCycle(codingCyclesCompleted = 0): Promise<void> {
    if (this.status.state === 'running') return;
    this.status.state = 'running';
    this.status.lastRunAt = Date.now();
    this.log(`Self-improvement cycle ${this.status.cyclesCompleted + 1} starting`);

    const metrics: CycleMetrics = {
      itemsProcessed: 0,
      itemsAdded: 0,
      itemsRemoved: 0,
      totalKnowledge: 0,
      nearDuplicatesFound: 0,
      staleFound: 0,
      highSimilarityPairs: 0,
      errors: 0,
    };

    try {
      /* Back up before any destructive operation */
      const storage = getStorage();
      this.status.currentTask = 'Creating backup before optimisation';
      storage.backup();
      this.log('Backup created — beginning optimisation passes');

      /* Pass 1: Deduplication */
      await this.deduplicateEntries(metrics);

      /* Pass 2: Confidence boosting for high-quality recent entries */
      await this.boostRecentConfidence(metrics);

      /* Pass 3: Prune stale low-confidence entries */
      await this.pruneStaleEntries(metrics);

      /* Pass 4: Reindex / cluster related entries */
      await this.reindexKeywords(metrics);

      metrics.totalKnowledge = storage.count();
      this.lastCodingCycleCount = codingCyclesCompleted;

      this.status.itemsProcessed += metrics.itemsProcessed;
      this.status.cyclesCompleted++;
      this.status.currentTask = null;
      this.status.state = 'completed';
      this.log(
        `Cycle complete — processed ${metrics.itemsProcessed} | removed ${metrics.itemsRemoved} | ` +
        `total KB: ${metrics.totalKnowledge}`
      );
    } catch (e) {
      metrics.errors++;
      this.status.errors++;
      this.status.state = 'error';
      this.log(`Cycle error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /* ── Pass 1: Real deduplication ────────────────────────────────────── */
  private async deduplicateEntries(metrics: CycleMetrics): Promise<void> {
    this.status.currentTask = 'Deduplicating knowledge entries';
    this.log('Pass 1: deduplicating — scanning all categories…');

    const storage = getStorage();
    const categories = [
      'programming', 'design', 'documentation', 'science',
      'general', 'web_content', 'dataset', 'conversation', 'mathematics',
    ] as const;

    const toRemove = new Set<string>();

    for (const cat of categories) {
      /* Process in batches */
      const entries = storage.getByCategory(cat, BATCH_SIZE);
      metrics.itemsProcessed += entries.length;

      /* 1a: Exact content fingerprint dedup */
      const fingerprintSeen = new Map<string, string>(); /* fingerprint → id */
      for (const entry of entries) {
        const fp = contentFingerprint(entry.content);
        if (fingerprintSeen.has(fp)) {
          /* Keep the one with higher confidence */
          const existingId = fingerprintSeen.get(fp)!;
          const existing = entries.find(e => e.id === existingId);
          if (existing && entry.confidence >= existing.confidence) {
            toRemove.add(existingId);
            fingerprintSeen.set(fp, entry.id);
          } else {
            toRemove.add(entry.id);
          }
          metrics.nearDuplicatesFound++;
        } else {
          fingerprintSeen.set(fp, entry.id);
        }
      }

      /* 1b: Keyword-similarity near-dup dedup — compare windows */
      const remaining = entries.filter(e => !toRemove.has(e.id));
      for (let i = 0; i < remaining.length; i++) {
        for (let j = i + 1; j < Math.min(i + 15, remaining.length); j++) {
          if (toRemove.has(remaining[j].id)) continue;
          const sim = jaccard(remaining[i].keywords, remaining[j].keywords);
          if (sim >= DEDUP_SIMILARITY_THRESHOLD) {
            /* Remove the one with lower confidence */
            const victim = remaining[i].confidence >= remaining[j].confidence
              ? remaining[j].id
              : remaining[i].id;
            toRemove.add(victim);
            metrics.nearDuplicatesFound++;
          }
        }
      }

      /* Yield to event loop between categories */
      await new Promise(r => setTimeout(r, 0));
    }

    if (toRemove.size > 0) {
      const removed = storage.removeMany([...toRemove]);
      metrics.itemsRemoved += removed;
      this.log(`Pass 1: removed ${removed} near-duplicates (${metrics.nearDuplicatesFound} found)`);
    } else {
      this.log('Pass 1: no duplicates found');
    }
  }

  /* ── Pass 2: Boost confidence ───────────────────────────────────────── */
  private async boostRecentConfidence(metrics: CycleMetrics): Promise<void> {
    this.status.currentTask = 'Boosting high-quality recent entries';
    this.log('Pass 2: boosting recent high-quality entries…');

    const storage = getStorage();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let boosted = 0;

    const recent = storage.getByCategory('programming', BATCH_SIZE)
      .concat(storage.getByCategory('science', BATCH_SIZE))
      .filter(e => e.timestamp > sevenDaysAgo && e.confidence >= 0.7 && e.confidence < 0.95);

    for (const entry of recent) {
      const newConf = Math.min(0.95, entry.confidence + 0.03);
      storage.update(entry.id, { confidence: newConf });
      boosted++;
    }

    await new Promise(r => setTimeout(r, 0));
    metrics.itemsProcessed += recent.length;
    this.log(`Pass 2: boosted confidence for ${boosted} recent high-quality entries`);
  }

  /* ── Pass 3: Prune stale entries ────────────────────────────────────── */
  private async pruneStaleEntries(metrics: CycleMetrics): Promise<void> {
    this.status.currentTask = 'Pruning stale low-confidence entries';
    this.log('Pass 3: checking for stale entries (>30 days, low confidence)…');

    const storage = getStorage();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const toRemove: string[] = [];

    const staleCats = ['web_content', 'general', 'dataset'] as const;
    for (const cat of staleCats) {
      const entries = storage.getByCategory(cat, BATCH_SIZE);
      for (const e of entries) {
        if (e.timestamp < thirtyDaysAgo && e.confidence < 0.4) {
          toRemove.push(e.id);
          metrics.staleFound++;
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }

    if (toRemove.length > 0) {
      const removed = storage.removeMany(toRemove);
      metrics.itemsRemoved += removed;
      this.log(`Pass 3: pruned ${removed} stale entries`);
    } else {
      this.log('Pass 3: no stale entries to prune');
    }
    metrics.itemsProcessed += metrics.staleFound;
  }

  /* ── Pass 4: Reindex / cluster analysis ────────────────────────────── */
  private async reindexKeywords(metrics: CycleMetrics): Promise<void> {
    this.status.currentTask = 'Reindexing and merging related knowledge clusters';
    this.log('Pass 4: analysing knowledge clusters for retrieval optimisation…');

    const storage = getStorage();
    const cats = ['programming', 'science', 'design'] as const;
    let highSimilarityPairs = 0;

    for (const cat of cats) {
      const entries = storage.getByCategory(cat, 100);
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < Math.min(i + 10, entries.length); j++) {
          const sim = jaccard(entries[i].keywords, entries[j].keywords);
          if (sim > 0.7) {
            highSimilarityPairs++;
            /* Merge keywords: add top keywords from j into i to improve retrieval */
            const mergedKeywords = [...new Set([...entries[i].keywords, ...entries[j].keywords])].slice(0, 40);
            storage.update(entries[i].id, { keywords: mergedKeywords });
          }
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }

    metrics.highSimilarityPairs = highSimilarityPairs;
    metrics.itemsProcessed += highSimilarityPairs;
    this.log(`Pass 4: ${highSimilarityPairs} high-similarity pairs — keywords merged for better retrieval`);
  }

  /* ── Logging ─────────────────────────────────────────────────────────── */
  private log(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    this.status.log.unshift(`[${ts}] ${msg}`);
    if (this.status.log.length > LOG_LIMIT) this.status.log.length = LOG_LIMIT;
    console.log(`[SelfImproving] ${msg}`);
  }
}

const _g = globalThis as typeof globalThis & { __nexiosSelfImproving?: SelfImprovingAgent };
export function getSelfImprovingAgent(): SelfImprovingAgent {
  if (!_g.__nexiosSelfImproving) _g.__nexiosSelfImproving = new SelfImprovingAgent();
  return _g.__nexiosSelfImproving;
}
