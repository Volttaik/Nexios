import type { OrchestratorStatus, AgentName } from '../types/index';
import { getLifecycle } from '../lifecycle/manager';
import { getSeekerAgent } from './seeker-agent';
import { getCodingAgent } from './coding-agent';
import { getSelfImprovingAgent } from './self-improving-agent';
import { createCheckpoint } from '../checkpoint/checkpoint';
import { getStorage } from '../knowledge/storage';

/* Intervals — stagger agents to avoid resource contention */
const SEEKER_INTERVAL_MS  = 3  * 60 * 1000;   // every 3 min
const CODING_INTERVAL_MS  = 2  * 60 * 1000;   // every 2 min
const IMPROVE_INTERVAL_MS = 8  * 60 * 1000;   // every 8 min
const POLL_INTERVAL_MS    = 10 * 1000;         // poll every 10 s
const STORAGE_WARN_EVERY  = 5  * 60 * 1000;   // warn at most every 5 min

class AgentOrchestrator {
  private running      = false;
  private cycleCount   = 0;
  private totalItems   = 0;
  private startedAt: number | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSeekerRun  = 0;
  private lastCodingRun  = 0;
  private lastImproveRun = 0;
  private lastStorageWarn = 0;
  private log: string[] = [];

  getStatus(): OrchestratorStatus {
    const seeker  = getSeekerAgent();
    const coding  = getCodingAgent();
    const improve = getSelfImprovingAgent();
    return {
      running:              this.running,
      currentAgent:         this.currentAgent(),
      cycleCount:           this.cycleCount,
      totalItemsProcessed:  this.totalItems,
      startedAt:            this.startedAt,
      learningEnabled:      getLifecycle().isLearning(),
      agents: {
        seeker:           seeker.getStatus(),
        coding:           coding.getStatus(),
        'self-improving': improve.getStatus(),
      },
    };
  }

  start(): void {
    if (this.running) return;
    this.running   = true;
    this.startedAt = Date.now();
    this.appendLog('Learning loop started');
    console.log('[Orchestrator] ▶ Learning loop started');

    /* Warm up coding agent so it knows which entries already exist */
    getCodingAgent().warmUp().catch(e =>
      console.warn('[Orchestrator] Coding warm-up error:', e)
    );

    /* Kick off first tick quickly */
    this.schedulePoll(2000);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    this.appendLog('Learning loop stopped');
    console.log('[Orchestrator] ■ Learning loop stopped');
  }

  private currentAgent(): AgentName | null {
    if (getSeekerAgent().getStatus().state  === 'running') return 'seeker';
    if (getCodingAgent().getStatus().state  === 'running') return 'coding';
    if (getSelfImprovingAgent().getStatus().state === 'running') return 'self-improving';
    return null;
  }

  private appendLog(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    this.log.unshift(`[${ts}] ${msg}`);
    if (this.log.length > 50) this.log.length = 50;
  }

  private schedulePoll(delay = POLL_INTERVAL_MS): void {
    if (!this.running) return;
    this.pollTimer = setTimeout(() => this.tick(), delay);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const lifecycle = getLifecycle();
    if (!lifecycle.isLearning()) {
      this.schedulePoll();
      return;
    }

    const now     = Date.now();
    const storage = getStorage();
    const seeker  = getSeekerAgent();
    const coding  = getCodingAgent();
    const improve = getSelfImprovingAgent();

    /* ── Storage limit check ──────────────────────────────────────────── */
    if (storage.isNearLimit() && now - this.lastStorageWarn > STORAGE_WARN_EVERY) {
      const stats = storage.storageStats();
      const msg = `Storage at ${stats.usagePercent}% capacity (${stats.entries}/${stats.maxEntries}) — triggering Self-Improving Agent to free space`;
      console.warn(`[Orchestrator] ${msg}`);
      this.appendLog(msg);
      this.lastStorageWarn = now;
      /* Force an improvement cycle to deduplicate and free space */
      this.lastImproveRun = 0;
    }

    /* ── Seeker Agent ─────────────────────────────────────────────────── */
    if (now - this.lastSeekerRun >= SEEKER_INTERVAL_MS) {
      this.lastSeekerRun = now;
      this.appendLog('Starting Seeker Agent');
      console.log('[Orchestrator] → Seeker Agent starting');
      /* Fire independently — failure does not block other agents */
      seeker.runCycle().catch(e => {
        const msg = `Seeker error: ${e instanceof Error ? e.message : String(e)}`;
        console.error('[Orchestrator]', msg);
        this.appendLog(msg);
      });
    }

    /* ── Coding Agent ─────────────────────────────────────────────────── */
    if (
      seeker.hasPending() &&
      (now - this.lastCodingRun >= CODING_INTERVAL_MS) &&
      coding.getStatus().state !== 'running'
    ) {
      const items = seeker.consumePending();
      if (items.length > 0) {
        this.lastCodingRun = now;
        const msg = `Starting Coding Agent — ${items.length} items to encode`;
        this.appendLog(msg);
        console.log(`[Orchestrator] → ${msg}`);

        coding.runCycle(items)
          .then(added => {
            this.totalItems += added;
            this.cycleCount++;
            this.appendLog(`Coding Agent finished — +${added} entries (total: ${storage.count()})`);

            /* Full checkpoint every 5 orchestrator cycles */
            if (this.cycleCount % 5 === 0) {
              createCheckpoint({
                knowledgeEntryCount: storage.count(),
                datasetsProcessed:   this.cycleCount,
                improvements: [
                  `Orchestrator cycle ${this.cycleCount}`,
                  `Total items encoded: ${this.totalItems}`,
                  `Storage at ${storage.storageStats().usagePercent}% capacity`,
                ],
              });
            }
          })
          .catch(e => {
            const msg = `Coding error: ${e instanceof Error ? e.message : String(e)}`;
            console.error('[Orchestrator]', msg);
            this.appendLog(msg);
          });
      }
    }

    /* ── Self-Improving Agent ─────────────────────────────────────────── */
    const codingCycles = coding.getStatus().cyclesCompleted;
    const improveReady = now - this.lastImproveRun >= IMPROVE_INTERVAL_MS;
    const shouldImprove = improve.shouldRun(codingCycles);

    if (improveReady && shouldImprove && improve.getStatus().state !== 'running') {
      this.lastImproveRun = now;
      this.appendLog('Starting Self-Improving Agent');
      console.log('[Orchestrator] → Self-Improving Agent starting');

      improve.runCycle(codingCycles).catch(e => {
        const msg = `Self-improving error: ${e instanceof Error ? e.message : String(e)}`;
        console.error('[Orchestrator]', msg);
        this.appendLog(msg);
      });
    }

    this.schedulePoll();
  }
}

const _g = globalThis as typeof globalThis & { __nexiosOrchestrator?: AgentOrchestrator };
export function getOrchestrator(): AgentOrchestrator {
  if (!_g.__nexiosOrchestrator) _g.__nexiosOrchestrator = new AgentOrchestrator();
  return _g.__nexiosOrchestrator;
}
