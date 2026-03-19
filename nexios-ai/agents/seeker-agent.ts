import type { AgentStatus } from '../types/index';
import { crawlBatch, crawlSpecificUrls } from '../acquisition/crawler';
import { fetchDataset, getDatasetCount } from '../datasets/fetcher';
import { getStructuredLearner } from '../learning/structured-learner';

const CRAWL_PAGES_PER_CYCLE = 4;
const LOG_LIMIT = 100;
const MAX_PENDING = 500;
const FETCH_RETRY = 2;

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

  pendingCount(): number {
    return this.pendingItems.length;
  }

  async runCycle(): Promise<void> {
    if (this.status.state === 'running') return;
    this.status.state = 'running';
    this.status.lastRunAt = Date.now();

    const cycleNum = this.status.cyclesCompleted + 1;
    this.log(`Cycle ${cycleNum} — web crawl + dataset fetch`);

    let gathered = 0;

    /* ── Phase 1: Web crawl (guided by current learning section) ───── */
    try {
      this.status.currentTask = 'Web crawling knowledge sources';
      const learner = getStructuredLearner();
      const sectionUrls = learner.getSectionCrawlUrls();
      const currentSection = learner.getCurrentSection();

      if (currentSection) {
        this.log(`Phase 1: crawling for section "${currentSection.name}"…`);
      } else {
        this.log('Phase 1: crawling general knowledge sources…');
      }

      let pages = null;
      for (let attempt = 1; attempt <= FETCH_RETRY; attempt++) {
        try {
          pages = sectionUrls.length > 0
            ? await crawlSpecificUrls(sectionUrls, CRAWL_PAGES_PER_CYCLE)
            : await crawlBatch(CRAWL_PAGES_PER_CYCLE);
          break;
        } catch (e) {
          if (attempt < FETCH_RETRY) {
            this.log(`Web crawl attempt ${attempt} failed — retrying…`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
          } else {
            throw e;
          }
        }
      }

      if (pages) {
        for (const p of pages) {
          if (p.isValid && p.content.length > 100 && this.pendingItems.length < MAX_PENDING) {
            this.pendingItems.push({
              content:    p.content,
              category:   p.category,
              source:     p.url,
              confidence: 0.75,
            });
            gathered++;
          }
        }
        this.log(`Web crawl: ${gathered} valid pages collected (${pages.length} fetched)`);
      }
    } catch (e) {
      this.status.errors++;
      this.log(`Web crawl error: ${e instanceof Error ? e.message : String(e)}`);
      /* Continue to dataset phase even if crawl fails */
    }

    /* ── Phase 2: Dataset fetch ─────────────────────────────────────── */
    try {
      this.status.currentTask = 'Fetching structured dataset';
      const idx = this.datasetCursor % Math.max(1, getDatasetCount());
      this.log(`Phase 2: fetching dataset #${idx}`);

      let ds = null;
      for (let attempt = 1; attempt <= FETCH_RETRY; attempt++) {
        try {
          ds = await fetchDataset(idx);
          break;
        } catch (e) {
          if (attempt < FETCH_RETRY) {
            this.log(`Dataset fetch attempt ${attempt} failed — retrying…`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
          } else {
            throw e;
          }
        }
      }

      this.datasetCursor++;

      if (ds && ds.entries.length > 0) {
        let datasetGathered = 0;
        for (const e of ds.entries) {
          if (e.content.length > 60 && this.pendingItems.length < MAX_PENDING) {
            this.pendingItems.push({
              content:    e.content,
              category:   ds.category,
              source:     ds.name,
              confidence: e.confidence,
            });
            gathered++;
            datasetGathered++;
          }
        }
        this.log(`Dataset "${ds.name}": ${datasetGathered} entries queued`);
      } else {
        this.log('Dataset fetch returned no entries — skipping');
      }
    } catch (e) {
      this.status.errors++;
      this.log(`Dataset fetch error: ${e instanceof Error ? e.message : String(e)}`);
      /* Self-contained failure — does not block other agents */
    }

    this.status.itemsProcessed += gathered;
    this.status.cyclesCompleted++;
    this.status.currentTask = null;
    this.status.state = 'completed';
    this.log(`Cycle ${cycleNum} complete — ${gathered} items queued (${this.pendingItems.length} total pending)`);
  }

  private log(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    this.status.log.unshift(`[${ts}] ${msg}`);
    if (this.status.log.length > LOG_LIMIT) this.status.log.length = LOG_LIMIT;
    console.log(`[Seeker] ${msg}`);
  }
}

const _g = globalThis as typeof globalThis & { __nexiosSeeker?: SeekerAgent };
export function getSeekerAgent(): SeekerAgent {
  if (!_g.__nexiosSeeker) _g.__nexiosSeeker = new SeekerAgent();
  return _g.__nexiosSeeker;
}
