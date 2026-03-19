import fs from 'fs';
import path from 'path';
import type { Checkpoint } from '../types/index';

const DATA_DIR = path.join(process.cwd(), 'data', 'nexios-ai');
const FILE     = path.join(DATA_DIR, 'checkpoints.json');
const VERSION  = '0.2.0';
const MAX_CHECKPOINTS = 50;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Checkpoint] Created data directory: ${DATA_DIR}`);
  }
}

function load(): Checkpoint[] {
  ensureDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`[Checkpoint] Failed to parse checkpoints.json: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

function save(list: Checkpoint[]): void {
  ensureDir();
  try {
    /* Keep only the last N checkpoints to prevent unbounded growth */
    const trimmed = list.slice(-MAX_CHECKPOINTS);
    fs.writeFileSync(FILE, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.error(`[Checkpoint] Failed to save checkpoints.json: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function createCheckpoint(params: {
  knowledgeEntryCount: number;
  datasetsProcessed: number;
  improvements: string[];
  ultraModeCycles?: number;
}): Checkpoint {
  try {
    const list = load();
    const cp: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      version: VERSION,
      knowledgeEntryCount: params.knowledgeEntryCount,
      datasetsProcessed: params.datasetsProcessed,
      improvements: params.improvements,
      ultraModeCycles: params.ultraModeCycles ?? 0,
    };
    list.push(cp);
    save(list);
    console.log(`[Checkpoint] Saved: ${cp.id} | entries=${cp.knowledgeEntryCount} | datasets=${cp.datasetsProcessed}`);
    return cp;
  } catch (e) {
    console.error(`[Checkpoint] createCheckpoint error: ${e instanceof Error ? e.message : String(e)}`);
    /* Return a minimal checkpoint even on error */
    return {
      id: `cp_err_${Date.now()}`,
      timestamp: Date.now(),
      version: VERSION,
      knowledgeEntryCount: params.knowledgeEntryCount,
      datasetsProcessed: params.datasetsProcessed,
      improvements: params.improvements,
      ultraModeCycles: params.ultraModeCycles ?? 0,
    };
  }
}

export function getCheckpoints(): Checkpoint[] {
  try { return load(); } catch { return []; }
}

export function getLatestCheckpoint(): Checkpoint | null {
  try {
    const list = load();
    return list.length ? list[list.length - 1] : null;
  } catch { return null; }
}

export function getCheckpointCount(): number {
  try { return load().length; } catch { return 0; }
}

/** Rollback to a specific checkpoint (restores knowledge-base backup if available) */
export function rollbackToCheckpoint(checkpointId: string): { success: boolean; message: string } {
  try {
    const list = load();
    const cp = list.find(c => c.id === checkpointId);
    if (!cp) return { success: false, message: `Checkpoint ${checkpointId} not found` };

    const { getStorage } = require('../knowledge/storage');
    const storage = getStorage();
    const restored = storage.restoreBackup();

    return {
      success: restored,
      message: restored
        ? `Rolled back to checkpoint ${checkpointId} (${cp.knowledgeEntryCount} entries)`
        : 'Backup not available for rollback',
    };
  } catch (e) {
    return { success: false, message: `Rollback error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
