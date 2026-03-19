import type { AgentStatus, KnowledgeCategory } from '../types/index';
import { getStorage } from '../knowledge/storage';
import { createCheckpoint } from '../checkpoint/checkpoint';
import { getStructuredLearner } from '../learning/structured-learner';
import crypto from 'crypto';

const LOG_LIMIT = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;
const CHECKPOINT_EVERY = 5;
const SCHEMA_VERSION = '1.2';

/* ── Types ────────────────────────────────────────────────────────────── */
export interface RawItem {
  content: string;
  category: KnowledgeCategory;
  source: string;
  confidence: number;
}

/* ── Encoding ─────────────────────────────────────────────────────────── */
function encodeEntry(item: RawItem): string {
  const normalised = item.content
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\t/g, '  ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  /* Versioned schema header for structured retrieval */
  const header = [
    `[SCHEMA:${SCHEMA_VERSION}]`,
    `[SRC:${item.source.slice(0, 80)}]`,
    `[CAT:${item.category}]`,
    `[CONF:${item.confidence.toFixed(2)}]`,
    `[TS:${Date.now()}]`,
  ].join('');

  return `${header}\n${normalised}`;
}

function generateKnowledgeId(content: string, source: string): string {
  return 'kid_' + crypto
    .createHash('sha256')
    .update(`${source}::${content.slice(0, 200)}`)
    .digest('hex')
    .slice(0, 16);
}

function isValidItem(item: RawItem): boolean {
  return (
    !!item.content &&
    item.content.trim().length >= 40 &&
    !!item.source &&
    item.confidence >= 0 &&
    item.confidence <= 1
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/* ── Main class ───────────────────────────────────────────────────────── */
export class CodingAgent {
  private status: AgentStatus = {
    name: 'coding',
    state: 'idle',
    cyclesCompleted: 0,
    itemsProcessed: 0,
    lastRunAt: null,
    nextRunAt: null,
    currentTask: null,
    errors: 0,
    log: [],
  };

  private seenIds = new Set<string>();

  getStatus(): AgentStatus {
    return { ...this.status, log: [...this.status.log] };
  }

  async runCycle(items: RawItem[]): Promise<number> {
    if (this.status.state === 'running') return 0;

    /* Validate input gracefully */
    const validItems = items.filter(isValidItem);
    if (validItems.length === 0) {
      this.status.state = 'idle';
      if (items.length > 0) {
        this.log(`Skipped ${items.length} item(s) — all failed validation`);
      }
      return 0;
    }

    this.status.state = 'running';
    this.status.lastRunAt = Date.now();
    this.status.currentTask = `Encoding ${validItems.length} items`;
    this.log(`Cycle ${this.status.cyclesCompleted + 1} — encoding ${validItems.length} items (${items.length - validItems.length} skipped)`);

    const storage = getStorage();

    /* Warn if near storage limit */
    if (storage.isNearLimit()) {
      this.log('WARNING: Knowledge base is approaching capacity — consider running Self-Improving Agent');
    }

    let added = 0;
    let skipped = 0;
    let retryTotal = 0;

    /* Process in batches for efficiency */
    const BATCH = 50;
    for (let batchStart = 0; batchStart < validItems.length; batchStart += BATCH) {
      const batch = validItems.slice(batchStart, batchStart + BATCH);
      this.status.currentTask = `Encoding batch ${Math.floor(batchStart / BATCH) + 1}/${Math.ceil(validItems.length / BATCH)}`;

      for (const item of batch) {
        const id = generateKnowledgeId(item.content, item.source);

        if (this.seenIds.has(id)) {
          skipped++;
          continue;
        }

        /* Retry loop */
        let success = false;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const encoded = encodeEntry(item);

            storage.store({
              content:    encoded,
              category:   item.category,
              source:     item.source,
              confidence: Math.min(1, Math.max(0.1, item.confidence)),
              metadata: {
                knowledgeId:   id,
                encodedAt:     Date.now(),
                agentVersion:  SCHEMA_VERSION,
                originalLength: item.content.length,
              },
            });

            this.seenIds.add(id);
            added++;
            success = true;
            break;
          } catch (e) {
            if (attempt < MAX_RETRIES) {
              retryTotal++;
              this.log(`Retry ${attempt}/${MAX_RETRIES} for item from ${item.source.slice(0, 40)}`);
              await sleep(RETRY_DELAY_MS * attempt);
            } else {
              this.status.errors++;
              this.log(`Encode failed after ${MAX_RETRIES} attempts: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        }

        if (!success) skipped++;
      }

      /* Flush after each batch */
      if (added > 0) storage.flush();

      /* Yield to event loop between batches */
      await new Promise(r => setTimeout(r, 0));
    }

    this.status.itemsProcessed += added;
    this.status.cyclesCompleted++;
    this.status.currentTask = null;
    this.status.state = 'completed';

    const logMsg = `Encoded ${added} entries (${skipped} skipped, ${retryTotal} retries) — KB total: ${storage.count()}`;
    this.log(logMsg);

    /* Create checkpoint every N cycles */
    if (this.status.cyclesCompleted % CHECKPOINT_EVERY === 0) {
      try {
        createCheckpoint({
          knowledgeEntryCount: storage.count(),
          datasetsProcessed: this.status.cyclesCompleted,
          improvements: [
            `Coding Agent cycle ${this.status.cyclesCompleted}`,
            `Total encoded: ${this.status.itemsProcessed}`,
            `Last batch: +${added} entries`,
          ],
        });
        this.log(`Checkpoint saved (cycle ${this.status.cyclesCompleted})`);
      } catch (e) {
        this.log(`Checkpoint failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    /* Check structured learning progression */
    try {
      const learner = getStructuredLearner();
      const advance = learner.checkAndAdvance(storage.count());
      if (advance.advanced) {
        this.log(`Learning section mastered: "${advance.from}" → next: "${advance.to ?? 'All complete'}"`);
      }
    } catch { /* non-critical */ }

    return added;
  }

  /** Seed the seen-IDs cache from storage to prevent re-encoding on restart */
  async warmUp(): Promise<void> {
    const storage = getStorage();
    const cats = ['programming', 'science', 'design', 'documentation', 'general', 'web_content', 'dataset'] as const;
    for (const cat of cats) {
      const entries = storage.getByCategory(cat, 200);
      for (const e of entries) {
        const meta = e.metadata as Record<string, unknown> | undefined;
        if (meta?.knowledgeId) this.seenIds.add(meta.knowledgeId as string);
      }
    }
    this.log(`Warmed up: ${this.seenIds.size} known IDs loaded from storage`);
  }

  private log(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    this.status.log.unshift(`[${ts}] ${msg}`);
    if (this.status.log.length > LOG_LIMIT) this.status.log.length = LOG_LIMIT;
    console.log(`[Coding] ${msg}`);
  }
}

const _g = globalThis as typeof globalThis & { __nexiosCoding?: CodingAgent };
export function getCodingAgent(): CodingAgent {
  if (!_g.__nexiosCoding) _g.__nexiosCoding = new CodingAgent();
  return _g.__nexiosCoding;
}
