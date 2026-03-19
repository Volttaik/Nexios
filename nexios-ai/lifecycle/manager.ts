import type { LifecycleState, LifecycleStatus } from '../types/index';

class LifecycleManager {
  private state: LifecycleState = 'idle';
  private learningEnabled = true;
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private stateChangedAt: number = Date.now();

  getStatus(): LifecycleStatus {
    return {
      state: this.state,
      learningEnabled: this.learningEnabled,
      startedAt: this.startedAt,
      pausedAt: this.pausedAt,
      stateChangedAt: this.stateChangedAt,
    };
  }

  getState(): LifecycleState {
    return this.state;
  }

  isRunning(): boolean {
    return this.state === 'running' || this.state === 'paused';
  }

  isLearning(): boolean {
    return this.state === 'running' && this.learningEnabled;
  }

  /* ── Transitions ──────────────────────────────────────────────────────── */

  async start(): Promise<{ success: boolean; message: string }> {
    if (this.state === 'running' || this.state === 'starting') {
      return { success: false, message: `AI is already ${this.state}` };
    }

    console.log('[Lifecycle] Idle → Starting');
    this.setState('starting');

    // Simulate boot sequence — load knowledge base, warm up engine
    await new Promise(r => setTimeout(r, 1200));

    this.setState('running');
    this.startedAt = Date.now();
    this.pausedAt = null;
    console.log('[Lifecycle] Starting → Running ✓');
    return { success: true, message: 'Nexios AI is now Running' };
  }

  stop(): { success: boolean; message: string } {
    if (this.state === 'idle') {
      return { success: false, message: 'AI is already Idle' };
    }
    console.log(`[Lifecycle] ${this.state} → Idle`);
    this.setState('idle');
    this.startedAt = null;
    this.pausedAt = null;
    return { success: true, message: 'Nexios AI stopped — now Idle' };
  }

  toggleLearning(): { success: boolean; message: string; learningEnabled: boolean } {
    if (!this.isRunning()) {
      return { success: false, message: 'AI must be Running to toggle learning', learningEnabled: this.learningEnabled };
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
      return { success: true, message: 'Learning paused — AI still responds intelligently', learningEnabled: false };
    }
  }

  private setState(s: LifecycleState) {
    this.state = s;
    this.stateChangedAt = Date.now();
  }
}

const _g = globalThis as typeof globalThis & { __nexiosLifecycle?: LifecycleManager };
export function getLifecycle(): LifecycleManager {
  if (!_g.__nexiosLifecycle) _g.__nexiosLifecycle = new LifecycleManager();
  return _g.__nexiosLifecycle;
}
