import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

/**
 * Nexios AI Code Runner — Execute Node.js and Python code snippets
 *
 * POST /api/nexios-ai/run
 * Body: { code: string, language: 'javascript' | 'python' | 'typescript' | 'bash' }
 *
 * Returns: { output: string, error: boolean, exitCode: number, executionMs: number }
 */

const MAX_TIMEOUT = 30000; // 30 seconds
const MAX_OUTPUT = 1024 * 512; // 512KB

// Block dangerous patterns
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /shutdown|reboot|halt|poweroff/i,
  /mkfs|dd\s+if=/i,
  />\s*\/dev\//,
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i,
  /process\.env\.(OPENCLAW|SECRET|TOKEN|KEY|PASSWORD)/i,
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /import.*from\s+['"]child_process['"]/,
  /subprocess|os\.system|os\.popen/i,
  /__import__\s*\(\s*['"]os['"]\s*\)/,
  /__import__\s*\(\s*['"]subprocess['"]\s*\)/,
];

function isSafe(code: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return { safe: false, reason: `Blocked: code contains a restricted pattern (${pattern.source})` };
    }
  }
  return { safe: true };
}

interface RunRequest {
  code: string;
  language: 'javascript' | 'python' | 'typescript' | 'bash';
  stdin?: string;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    const body = (await req.json()) as RunRequest;
    const { code, language, stdin } = body;

    if (!code?.trim()) {
      return NextResponse.json({ output: 'No code provided', error: true, exitCode: 1, executionMs: 0 });
    }

    if (!['javascript', 'python', 'typescript', 'bash'].includes(language)) {
      return NextResponse.json({
        output: `Unsupported language: ${language}. Supported: javascript, python, typescript, bash`,
        error: true,
        exitCode: 1,
        executionMs: 0,
      });
    }

    const safety = isSafe(code);
    if (!safety.safe) {
      return NextResponse.json({
        output: `⚠️ ${safety.reason}`,
        error: true,
        exitCode: 1,
        executionMs: 0,
      });
    }

    // Create isolated temp directory
    const runId = randomUUID().slice(0, 12);
    const sandboxDir = join(tmpdir(), `nexios-run-${runId}`);
    await mkdir(sandboxDir, { recursive: true });

    try {
      let filename: string;
      let command: string;

      switch (language) {
        case 'javascript':
          filename = 'script.js';
          command = `node "${join(sandboxDir, filename)}"`;
          break;
        case 'typescript':
          filename = 'script.ts';
          command = `npx --yes tsx "${join(sandboxDir, filename)}"`;
          break;
        case 'python':
          filename = 'script.py';
          command = `python3 "${join(sandboxDir, filename)}"`;
          break;
        case 'bash':
          filename = 'script.sh';
          command = `bash "${join(sandboxDir, filename)}"`;
          break;
        default:
          filename = 'script.js';
          command = `node "${join(sandboxDir, filename)}"`;
      }

      await writeFile(join(sandboxDir, filename), code, 'utf-8');

      const { stdout, stderr } = await execAsync(command, {
        cwd: sandboxDir,
        timeout: MAX_TIMEOUT,
        maxBuffer: MAX_OUTPUT,
        env: {
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
          HOME: sandboxDir,
          TMPDIR: sandboxDir,
          NODE_ENV: 'production',
          PYTHONUNBUFFERED: '1',
          // Explicitly do NOT pass sensitive env vars
        },
        ...(stdin ? {} : {}),
      });

      const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
      return NextResponse.json({
        output: combined || '(completed with no output)',
        error: false,
        exitCode: 0,
        executionMs: Date.now() - t0,
        language,
      });
    } catch (execErr: unknown) {
      const err = execErr as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean; code?: string | number };

      if (err.killed || err.code === 'ETIMEDOUT') {
        const partial = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
        return NextResponse.json({
          output: (partial ? partial + '\n\n' : '') + `⏱️ Execution timed out after ${MAX_TIMEOUT / 1000}s`,
          error: true,
          exitCode: 124,
          executionMs: Date.now() - t0,
          language,
        });
      }

      const errOutput = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
      return NextResponse.json({
        output: errOutput || 'Execution failed',
        error: true,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        executionMs: Date.now() - t0,
        language,
      });
    } finally {
      // Clean up sandbox directory
      rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      output: `Internal error: ${msg}`,
      error: true,
      exitCode: 1,
      executionMs: Date.now() - t0,
    });
  }
}

export async function GET() {
  // Check which runtimes are available
  const runtimes: Record<string, string | null> = {};

  for (const [name, cmd] of [['node', 'node --version'], ['python3', 'python3 --version'], ['bash', 'bash --version | head -1']]) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      runtimes[name] = stdout.trim();
    } catch {
      runtimes[name] = null;
    }
  }

  return NextResponse.json({
    status: 'operational',
    runtimes,
    supportedLanguages: ['javascript', 'python', 'typescript', 'bash'],
    maxTimeout: MAX_TIMEOUT,
    maxOutput: MAX_OUTPUT,
  });
}
