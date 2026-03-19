import type { AgentStatus, KnowledgeCategory } from '../types/index';
import { getStorage } from '../knowledge/storage';
import crypto from 'crypto';

const LOG_LIMIT = 50;

interface RawItem {
  content: string;
  category: KnowledgeCategory;
  source: string;
  confidence: number;
}

function encodeEntry(item: RawItem): string {
  /* Lightweight internal encoding: normalise whitespace, strip control chars,
     prefix with source tag so retrieval can use structural hints */
  const normalised = item.content
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\t/g, '  ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return `[SRC:${item.source.slice(0, 80)}][CAT:${item.category}]\n${normalised}`;
}

function generateKnowledgeId(content: string, source: string): string {
  return 'kid_' + crypto.createHash('sha256').update(`${source}::${content.slice(0, 200)}`).digest('hex').slice(0, 16);
}

function isDuplicate(existing: Set<string>, id: string): boolean {
  return existing.has(id);
}

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
    if (!items.length) {
      this.status.state = 'idle';
      return 0;
    }

    this.status.state = 'running';
    this.status.lastRunAt = Date.now();
    this.status.currentTask = `Encoding ${items.length} raw items`;
    this.log(`Cycle ${this.status.cyclesCompleted + 1} — encoding ${items.length} items`);

    const storage = getStorage();
    let added = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        if (!item.content || item.content.trim().length < 40) { skipped++; continue; }

        const id = generateKnowledgeId(item.content, item.source);
        if (isDuplicate(this.seenIds, id)) { skipped++; continue; }
        this.seenIds.add(id);

        const encoded = encodeEntry(item);

        storage.store({
          content: encoded,
          category: item.category,
          source: item.source,
          confidence: Math.min(1, Math.max(0.1, item.confidence)),
          metadata: { knowledgeId: id, encodedAt: Date.now(), agentVersion: '1.0' },
        });

        added++;
      } catch (e) {
        this.status.errors++;
        this.log(`Encode error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (added > 0) storage.flush();

    this.status.itemsProcessed += added;
    this.status.cyclesCompleted++;
    this.status.currentTask = null;
    this.status.state = 'completed';
    this.log(`Encoded ${added} entries (skipped ${skipped} duplicates/short) — KB total: ${storage.count()}`);

    return added;
  }

  private log(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    this.status.log.unshift(`[${ts}] ${msg}`);
    if (this.status.log.length > LOG_LIMIT) this.status.log.length = LOG_LIMIT;
    console.log(`[Coding] ${msg}`);
  }
}

let instance: CodingAgent | null = null;
export function getCodingAgent(): CodingAgent {
  if (!instance) instance = new CodingAgent();
  return instance;
}
