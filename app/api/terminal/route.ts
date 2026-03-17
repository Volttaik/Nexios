import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /shutdown/,
  /reboot/,
  /halt/,
  /poweroff/,
  /mkfs/,
  /dd\s+if=/,
  />\s*\/dev\//,
  /curl.*\|\s*sh/,
  /wget.*\|\s*sh/,
];

function isSafe(cmd: string): boolean {
  return !BLOCKED_PATTERNS.some(p => p.test(cmd));
}

function sanitizeProjectId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, files, projectId } = body as {
      command: string;
      files?: { path: string; content: string }[];
      projectId?: string;
    };

    const cmd = (command || '').trim();
    if (!cmd) return NextResponse.json({ output: 'No command provided', error: true });

    if (!isSafe(cmd)) {
      return NextResponse.json({ output: `Permission denied: command blocked for safety`, error: true });
    }

    const safeId = sanitizeProjectId(projectId || 'workspace');
    const tmpDir = join(tmpdir(), 'nexios-' + safeId);
    await mkdir(tmpDir, { recursive: true });

    if (files && Array.isArray(files)) {
      for (const { path: filePath, content } of files) {
        if (!filePath || filePath.includes('..')) continue;
        const fullPath = join(tmpDir, filePath);
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (dirPath && dirPath !== tmpDir) {
          await mkdir(dirPath, { recursive: true }).catch(() => {});
        }
        await writeFile(fullPath, content || '').catch(() => {});
      }
    }

    const isLongRunning = /^(npm\s+run\s+dev|npm\s+start|next\s+dev|vite|yarn\s+dev)/.test(cmd);
    const timeout = isLongRunning ? 8000 : 30000;

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: tmpDir,
        timeout,
        env: {
          ...process.env,
          HOME: tmpDir,
          PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          NODE_ENV: 'development',
        },
        maxBuffer: 1024 * 1024 * 5,
      });

      const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
      return NextResponse.json({
        output: combined || '(command completed with no output)',
        error: false,
        cwd: tmpDir,
      });
    } catch (execErr: unknown) {
      const err = execErr as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean };
      if (err.killed || err.code === 'ETIMEDOUT') {
        const partialOut = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
        return NextResponse.json({
          output: (partialOut ? partialOut + '\n\n' : '') + `⚡ Process is running in background (timeout after ${timeout / 1000}s). Use the Run button to preview.`,
          error: false,
          cwd: tmpDir,
        });
      }
      const errOutput = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n').trim();
      return NextResponse.json({ output: errOutput || 'Command failed', error: true });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ output: msg, error: true });
  }
}
