import type { UltraModeStatus } from '../types/index';
import { crawlBatch } from '../acquisition/crawler';
import { validateContent } from '../acquisition/validator';
import { getTrainer } from '../learning/trainer';
import { getStorage } from '../knowledge/storage';
import { createCheckpoint } from '../checkpoint/checkpoint';
import { getCompletedCount } from '../learning/dataset-loader';
import { SecurityGuard } from '../security/guard';

const CYCLE_INTERVAL_MS = 5 * 60 * 1000;
const PAGES_PER_CYCLE = 3;

class UltraMode {
  private status: UltraModeStatus = {
    active: false,
    cyclesCompleted: 0,
    pagesCollected: 0,
    entriesAdded: 0,
    currentPhase: undefined,
  };

  private timer: ReturnType<typeof setTimeout> | null = null;

  start(): boolean {
    if (this.status.active) {
      console.log('[Ultra] Already active');
      return false;
    }

    if (!SecurityGuard.canModifyKnowledge('ultra-mode')) {
      console.error('[Ultra] Security denied');
      return false;
    }

    this.status.active = true;
    console.log('[Ultra] ✦ Ultra Mode ACTIVATED — autonomous learning begins');
    this.scheduleNext(3000);
    return true;
  }

  stop(): void {
    this.status.active = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.status.currentPhase = undefined;
    console.log('[Ultra] Ultra Mode STOPPED');
  }

  getStatus(): UltraModeStatus { return { ...this.status }; }

  private scheduleNext(delay = CYCLE_INTERVAL_MS) {
    if (!this.status.active) return;
    this.status.nextCycleAt = Date.now() + delay;
    this.timer = setTimeout(() => this.runCycle(), delay);
  }

  private async runCycle() {
    if (!this.status.active) return;
    const cycleNum = this.status.cyclesCompleted + 1;
    console.log(`\n[Ultra] ── Cycle ${cycleNum} START ──`);

    try {
      this.status.currentPhase = 'searching';
      this.status.lastCycleAt = Date.now();

      this.status.currentPhase = 'crawling';
      console.log(`[Ultra] Phase: crawling ${PAGES_PER_CYCLE} pages`);
      const pages = await crawlBatch(PAGES_PER_CYCLE);
      this.status.pagesCollected += pages.length;

      this.status.currentPhase = 'validating';
      const validPages = pages.filter(p => p.isValid);
      console.log(`[Ultra] ${validPages.length}/${pages.length} pages passed validation`);

      this.status.currentPhase = 'storing';
      const trainer = getTrainer();
      const storage = getStorage();

      const items = validPages.map(p => {
        const { valid, score } = validateContent(p.content, p.url);
        return {
          content: p.content,
          category: p.category,
          source: p.url,
          confidence: Math.round(score * 100) / 100,
        };
      }).filter(item => item.confidence > 0.3);

      const added = await trainer.ingestCrawledContent(items);
      this.status.entriesAdded += added;

      this.status.currentPhase = 'checkpointing';
      createCheckpoint({
        knowledgeEntryCount: storage.count(),
        datasetsProcessed: getCompletedCount(),
        improvements: [
          `Ultra cycle ${cycleNum}: crawled ${pages.length} pages`,
          `Validated ${validPages.length} pages`,
          `Added ${added} new knowledge entries`,
        ],
        ultraModeCycles: cycleNum,
      });

      this.status.cyclesCompleted = cycleNum;
      this.status.currentPhase = undefined;
      console.log(`[Ultra] ── Cycle ${cycleNum} COMPLETE — added ${added} entries, total=${storage.count()} ──\n`);
    } catch (e) {
      console.error(`[Ultra] Cycle ${cycleNum} error:`, e);
      this.status.currentPhase = 'error';
    }

    this.scheduleNext();
  }
}

let ultra: UltraMode | null = null;
export function getUltra(): UltraMode {
  if (!ultra) ultra = new UltraMode();
  return ultra;
}
