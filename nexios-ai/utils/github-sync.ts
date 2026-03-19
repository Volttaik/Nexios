import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './paths';

const GITHUB_API = 'https://api.github.com';
const REPO = process.env.GITHUB_REPO ?? 'Volttaik/Nexios';
const BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const MIN_SYNC_INTERVAL_MS = 60 * 60 * 1000;

let lastSyncAt = 0;
let syncInProgress = false;

interface SyncFile {
  localPath: string;
  remotePath: string;
}

const SYNC_FILES: SyncFile[] = [
  { localPath: path.join(DATA_DIR, 'knowledge-base.json'), remotePath: 'data/nexios-ai/knowledge-base.json' },
  { localPath: path.join(DATA_DIR, 'datasets.json'),       remotePath: 'data/nexios-ai/datasets.json' },
  { localPath: path.join(DATA_DIR, 'learning-progress.json'), remotePath: 'data/nexios-ai/learning-progress.json' },
];

async function getRemoteSha(token: string, remotePath: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${remotePath}?ref=${BRANCH}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { sha?: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

async function pushFile(token: string, file: SyncFile, message: string): Promise<boolean> {
  if (!fs.existsSync(file.localPath)) return false;
  try {
    const content = Buffer.from(fs.readFileSync(file.localPath, 'utf-8')).toString('base64');
    const sha = await getRemoteSha(token, file.remotePath);

    const body: Record<string, unknown> = { message, content, branch: BRANCH };
    if (sha) body.sha = sha;

    const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${file.remotePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncToGitHub(reason = 'Automated learning data sync'): Promise<{
  synced: boolean;
  filesUpdated: number;
  skipped?: string;
}> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { synced: false, filesUpdated: 0, skipped: 'GITHUB_TOKEN not set' };
  }

  if (syncInProgress) {
    return { synced: false, filesUpdated: 0, skipped: 'Sync already in progress' };
  }

  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    const waitMins = Math.round((MIN_SYNC_INTERVAL_MS - (now - lastSyncAt)) / 60000);
    return { synced: false, filesUpdated: 0, skipped: `Rate limited — next sync in ~${waitMins} min` };
  }

  syncInProgress = true;
  let filesUpdated = 0;

  const commitMessage = `[Nexios AI] ${reason} — ${new Date().toISOString()}`;

  try {
    for (const file of SYNC_FILES) {
      const ok = await pushFile(token, file, commitMessage);
      if (ok) {
        filesUpdated++;
        console.log(`[GitHubSync] Pushed: ${file.remotePath}`);
      }
    }
    lastSyncAt = Date.now();
    console.log(`[GitHubSync] Sync complete — ${filesUpdated} file(s) updated`);
    return { synced: true, filesUpdated };
  } catch (e) {
    console.error('[GitHubSync] Sync failed:', e instanceof Error ? e.message : String(e));
    return { synced: false, filesUpdated: 0, skipped: String(e) };
  } finally {
    syncInProgress = false;
  }
}

export function shouldSync(): boolean {
  return Date.now() - lastSyncAt >= MIN_SYNC_INTERVAL_MS && !syncInProgress;
}
