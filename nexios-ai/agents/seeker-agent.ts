import type { AgentStatus } from '../types/index';
import { crawlBatch } from '../acquisition/crawler';
import { fetchDataset, getDatasetCount } from '../datasets/fetcher';

const CRAWL_PAGES_PER_CYCLE = 4;
const LOG_LIMIT = 50;

export class SeekerAgent {
  private status: AgentStatus = {
    name: 'seeker',
    state: 'idle',
    cyclesCompleted: 0,
    itemsProcessed: 0,
    lastRunAt: null,
    nextRunAt: null,
    currentTask: null,
    errors: 0,
    log: [],
  };

  private datasetCursor = 0;

  /* collected pages/entries waiting to be consumed by CodingAgent */
  private pendingItems: Array<{
    content: string;
    category: import('../types/index').KnowledgeCategory;
    source: string;
    confidence: number;
  }> = [];

  getStatus(): AgentStatus {
    return { ...this.status, log: [...this.status.log] };
  }

  consumePending() {
    const items = [...this.pendingItems];
    this.pendingItems = [];
    return items;
  }

  hasPending(): boolean {
    return this.pendingItems.length > 0;
  }

  async runCycle(): Promise<void> {
    if (this.status.state === 'running') return;
    this.status.state = 'running';
    this.status.lastRunAt = Date.now();

    this.log(`Cycle ${this.status.cyclesCompleted + 1} — web crawl + dataset fetch`);

    let gathered = 0;

    /* Phase 1: web crawl */
    try {
      this.status.currentTask = 'Web crawling knowledge sources';
      this.log('Phase 1: crawling web sources…');
      const pages = await crawlBatch(CRAWL_PAGES_PER_CYCLE);
      for (const p of pages) {
        if (p.isValid && p.content.length > 100) {
          this.pendingItems.push({
            content: p.content,
            category: p.category,
            source: p.url,
            confidence: 0.75,
          });
          gathered++;
        }
      }
      this.log(`Web crawl: ${gathered} valid pages collected`);
    } catch (e) {
      this.status.errors++;
      this.log(`Web crawl error: ${e instanceof Error ? e.message : String(e)}`);
    }

    /* Phase 2: dataset fetch */
    try {
      this.status.currentTask = 'Fetching structured dataset';
      const idx = this.datasetCursor % getDatasetCount();
      this.log(`Phase 2: fetching dataset #${idx}`);
      const ds = await fetchDataset(idx);
      this.datasetCursor++;

      if (ds) {
        for (const e of ds.entries) {
          if (e.content.length > 60) {
            this.pendingItems.push({
              content: e.content,
              category: ds.category,
              source: ds.name,
              confidence: e.confidence,
            });
            gathered++;
          }
        }
        this.log(`Dataset "${ds.name}": ${ds.entries.length} entries collected`);
      } else {
        this.log('Dataset fetch returned no entries');
      }
    } catch (e) {
      this.status.errors++;
      this.log(`Dataset fetch error: ${e instanceof Error ? e.message : String(e)}`);
    }

    this.status.itemsProcessed += gathered;
    this.status.cyclesCompleted++;
    this.status.currentTask = null;
    this.status.state = 'completed';
    this.log(`Cycle complete — ${gathered} items queued for encoding`);
  }

  private log(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    this.status.log.unshift(`[${ts}] ${msg}`);
    if (this.status.log.length > LOG_LIMIT) this.status.log.length = LOG_LIMIT;
    console.log(`[Seeker] ${msg}`);
  }
}

let instance: SeekerAgent | null = null;
export function getSeekerAgent(): SeekerAgent {
  if (!instance) instance = new SeekerAgent();
  return instance;
}
