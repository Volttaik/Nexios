import type { OrchestratorStatus, AgentName } from '../types/index';
import { getLifecycle } from '../lifecycle/manager';
import { getSeekerAgent } from './seeker-agent';
import { getCodingAgent } from './coding-agent';
import { getSelfImprovingAgent } from './self-improving-agent';
import { createCheckpoint } from '../checkpoint/checkpoint';
import { getStorage } from '../knowledge/storage';

/* Intervals — stagger agents to avoid resource contention */
const SEEKER_INTERVAL_MS  = 3  * 60 * 1000;  // every 3 min
const CODING_INTERVAL_MS  = 2  * 60 * 1000;  // every 2 min (after seeker)
const IMPROVE_INTERVAL_MS = 8  * 60 * 1000;  // every 8 min
const POLL_INTERVAL_MS    = 10 * 1000;        // orchestrator poll tick

class AgentOrchestrator {
  private running = false;
  private cycleCount = 0;
  private totalItems = 0;
  private startedAt: number | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSeekerRun  = 0;
  private lastCodingRun  = 0;
  private lastImproveRun = 0;

  getStatus(): OrchestratorStatus {
    const seeker  = getSeekerAgent();
    const coding  = getCodingAgent();
    const improve = getSelfImprovingAgent();

    return {
      running: this.running,
      currentAgent: this.currentAgent(),
      cycleCount: this.cycleCount,
      totalItemsProcessed: this.totalItems,
      startedAt: this.startedAt,
      learningEnabled: getLifecycle().isLearning(),
      agents: {
        seeker: seeker.getStatus(),
        coding: coding.getStatus(),
        'self-improving': improve.getStatus(),
      },
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    console.log('[Orchestrator] ▶ Learning loop started');
    this.schedulePoll(2000);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    console.log('[Orchestrator] ■ Learning loop stopped');
  }

  private currentAgent(): AgentName | null {
    const seeker  = getSeekerAgent().getStatus();
    const coding  = getCodingAgent().getStatus();
    const improve = getSelfImprovingAgent().getStatus();
    if (seeker.state === 'running')  return 'seeker';
    if (coding.state === 'running')  return 'coding';
    if (improve.state === 'running') return 'self-improving';
    return null;
  }

  private schedulePoll(delay = POLL_INTERVAL_MS) {
    if (!this.running) return;
    this.pollTimer = setTimeout(() => this.tick(), delay);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const lifecycle = getLifecycle();

    /* Only run learning agents when AI is actually Running with learning on */
    if (!lifecycle.isLearning()) {
      this.schedulePoll();
      return;
    }

    const now = Date.now();
    const seeker  = getSeekerAgent();
    const coding  = getCodingAgent();
    const improve = getSelfImprovingAgent();

    /* ── Seeker ───────────────────────────────────────────────────────── */
    if (now - this.lastSeekerRun >= SEEKER_INTERVAL_MS) {
      this.lastSeekerRun = now;
      console.log('[Orchestrator] → Seeker Agent starting');
      await seeker.runCycle().catch(e => console.error('[Orchestrator] Seeker error:', e));
    }

    /* ── Coding (consumes Seeker output) ─────────────────────────────── */
    if (now - this.lastCodingRun >= CODING_INTERVAL_MS || seeker.hasPending()) {
      const items = seeker.consumePending();
      if (items.length > 0) {
        this.lastCodingRun = now;
        console.log(`[Orchestrator] → Coding Agent encoding ${items.length} items`);
        const added = await coding.runCycle(items).catch(e => {
          console.error('[Orchestrator] Coding error:', e);
          return 0;
        });
        this.totalItems += added;
        this.cycleCount++;

        /* Checkpoint every 5 cycles */
        if (this.cycleCount % 5 === 0) {
          const storage = getStorage();
          createCheckpoint({
            knowledgeEntryCount: storage.count(),
            datasetsProcessed: this.cycleCount,
            improvements: [
              `Orchestrator cycle ${this.cycleCount}`,
              `Total items encoded: ${this.totalItems}`,
            ],
          });
        }
      }
    }

    /* ── Self-Improving ───────────────────────────────────────────────── */
    if (now - this.lastImproveRun >= IMPROVE_INTERVAL_MS) {
      this.lastImproveRun = now;
      console.log('[Orchestrator] → Self-Improving Agent starting');
      await improve.runCycle().catch(e => console.error('[Orchestrator] Self-improving error:', e));
    }

    this.schedulePoll();
  }
}

let instance: AgentOrchestrator | null = null;
export function getOrchestrator(): AgentOrchestrator {
  if (!instance) instance = new AgentOrchestrator();
  return instance;
}
