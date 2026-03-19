import type { LifecycleState, LifecycleStatus } from '../types/index';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'nexios-ai');
const INIT_FLAG = path.join(DATA_DIR, '.initialized');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Lifecycle] Created data directory: ${DATA_DIR}`);
  }
}

function isFirstRun(): boolean {
  return !fs.existsSync(INIT_FLAG);
}

function markInitialized(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(INIT_FLAG, new Date().toISOString());
  } catch { /* non-critical */ }
}

class LifecycleManager {
  private state: LifecycleState = 'idle';
  private learningEnabled = true;
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private stateChangedAt: number = Date.now();
  private bootLog: string[] = [];

  constructor() {
    ensureDataDir();
    this.bootLog.push(`[${new Date().toISOString()}] Lifecycle Manager initialised`);
    this.bootLog.push(`[${new Date().toISOString()}] Data directory: ${DATA_DIR}`);
    this.bootLog.push(`[${new Date().toISOString()}] First run: ${isFirstRun()}`);
  }

  getStatus(): LifecycleStatus {
    return {
      state: this.state,
      learningEnabled: this.learningEnabled,
      startedAt: this.startedAt,
      pausedAt: this.pausedAt,
      stateChangedAt: this.stateChangedAt,
    };
  }

  getState(): LifecycleState { return this.state; }

  isRunning(): boolean {
    return this.state === 'running' || this.state === 'paused';
  }

  isLearning(): boolean {
    return this.state === 'running' && this.learningEnabled;
  }

  /* ── Transitions ──────────────────────────────────────────────────────── */
  async start(): Promise<{ success: boolean; message: string; firstRun?: boolean }> {
    if (this.state === 'running' || this.state === 'starting') {
      return { success: false, message: `AI is already ${this.state}` };
    }

    console.log('[Lifecycle] Idle → Starting');
    this.setState('starting');

    const firstRun = isFirstRun();

    try {
      ensureDataDir();

      /* Load knowledge base and warm up storage */
      const { getStorage } = await import('../knowledge/storage');
      const storage = getStorage();
      const kbSize = storage.count();
      this.bootLog.push(`[${new Date().toISOString()}] Knowledge base loaded: ${kbSize} entries`);
      console.log(`[Lifecycle] Knowledge base: ${kbSize} entries loaded`);

      /* On first run, load built-in training datasets */
      if (firstRun || kbSize === 0) {
        console.log('[Lifecycle] First run detected — loading built-in knowledge datasets…');
        this.bootLog.push(`[${new Date().toISOString()}] Loading built-in datasets (first run)`);
        try {
          const { getTrainer } = await import('../learning/trainer');
          const trainer = getTrainer();
          const { added, datasets } = await trainer.trainBuiltinDatasets();
          const msg = `Built-in training complete: ${added} entries from ${datasets} datasets`;
          console.log(`[Lifecycle] ${msg}`);
          this.bootLog.push(`[${new Date().toISOString()}] ${msg}`);
          markInitialized();
        } catch (e) {
          const msg = `Built-in dataset load error: ${e instanceof Error ? e.message : String(e)}`;
          console.error(`[Lifecycle] ${msg}`);
          this.bootLog.push(`[${new Date().toISOString()}] WARN: ${msg}`);
          /* Non-fatal — continue to running state */
        }
      }

      /* Brief warmup pause */
      await new Promise(r => setTimeout(r, 800));

      this.setState('running');
      this.startedAt = Date.now();
      this.pausedAt  = null;
      console.log('[Lifecycle] Starting → Running ✓');
      return { success: true, message: 'Nexios AI is now Running', firstRun };
    } catch (e) {
      const msg = `Start failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error('[Lifecycle]', msg);
      this.setState('idle');
      return { success: false, message: msg };
    }
  }

  stop(): { success: boolean; message: string } {
    if (this.state === 'idle') {
      return { success: false, message: 'AI is already Idle' };
    }
    console.log(`[Lifecycle] ${this.state} → Idle`);
    this.setState('idle');
    this.startedAt = null;
    this.pausedAt  = null;
    return { success: true, message: 'Nexios AI stopped — now Idle' };
  }

  toggleLearning(): { success: boolean; message: string; learningEnabled: boolean } {
    if (!this.isRunning()) {
      return {
        success: false,
        message: 'AI must be Running to toggle learning',
        learningEnabled: this.learningEnabled,
      };
    }

    this.learningEnabled = !this.learningEnabled;

    if (this.learningEnabled) {
      if (this.state === 'paused') {
        this.setState('running');
        this.pausedAt = null;
        console.log('[Lifecycle] Paused → Running (learning re-enabled)');
      }
      return { success: true, message: 'Continuous learning resumed', learningEnabled: true };
    } else {
      if (this.state === 'running') {
        this.setState('paused');
        this.pausedAt = Date.now();
        console.log('[Lifecycle] Running → Paused (learning disabled)');
      }
      return {
        success: true,
        message: 'Learning paused — AI still responds intelligently using existing knowledge',
        learningEnabled: false,
      };
    }
  }

  getBootLog(): string[] { return [...this.bootLog]; }

  private setState(s: LifecycleState): void {
    this.state = s;
    this.stateChangedAt = Date.now();
  }
}

const _g = globalThis as typeof globalThis & { __nexiosLifecycle?: LifecycleManager };
export function getLifecycle(): LifecycleManager {
  if (!_g.__nexiosLifecycle) _g.__nexiosLifecycle = new LifecycleManager();
  return _g.__nexiosLifecycle;
}
