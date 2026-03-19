import fs from 'fs';
import path from 'path';
import type { Checkpoint } from '../types/index';

const DATA_DIR = path.join(process.cwd(), 'data', 'nexios-ai');
const FILE = path.join(DATA_DIR, 'checkpoints.json');
const VERSION = '0.1.0-baseline';

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load(): Checkpoint[] {
  ensureDir();
  if (!fs.existsSync(FILE)) return [];
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); } catch { return []; }
}

function save(list: Checkpoint[]) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

export function createCheckpoint(params: {
  knowledgeEntryCount: number;
  datasetsProcessed: number;
  improvements: string[];
  ultraModeCycles?: number;
}): Checkpoint {
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
  console.log(`[Checkpoint] Saved: ${cp.id} | entries=${cp.knowledgeEntryCount} datasets=${cp.datasetsProcessed}`);
  return cp;
}

export function getCheckpoints(): Checkpoint[] { return load(); }
export function getLatestCheckpoint(): Checkpoint | null {
  const list = load();
  return list.length ? list[list.length - 1] : null;
}
export function getCheckpointCount(): number { return load().length; }
