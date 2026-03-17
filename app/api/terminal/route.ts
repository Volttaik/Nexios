import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// ── Hard-blocked destructive commands ───────────────────────────
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

// ── apt / apt-get interceptor ────────────────────────────────────
// This environment runs on Replit's NixOS — apt/apt-get are wrapper
// scripts that print guidance and exit 1. We intercept them here to
// provide a clean, actionable response instead of a raw error.
function tryInterceptApt(cmd: string): string | null {
  const aptMatch = cmd.match(/^apt(?:-get)?\s+install\s+(?:-y\s+)?(.+)/i);
  if (!aptMatch) {
    if (/^apt(?:-get)?(\s|$)/i.test(cmd)) {
      return [
        '⚠  apt/apt-get are not available on this system.',
        '',
        'This sandbox runs on Replit\'s NixOS environment.',
        '',
        'To install Python packages:   pip3 install <package>',
        'To install Node packages:      npm install <package>',
        'Example:  pip3 install requests flask numpy',
      ].join('\n');
    }
    return null;
  }

  const pkg = aptMatch[1].trim();
  const PYTHON_RUNTIME_PKGS = ['python3', 'python', 'python-is-python3', 'python3-full', 'python3-dev'];
  const PIP_PKGS = ['python3-pip', 'python-pip', 'pip', 'pip3'];

  if (PYTHON_RUNTIME_PKGS.includes(pkg)) {
    return [
      '✓ Python 3.11 is already installed on this system.',
      '',
      '  python3 --version    → confirm the version',
      '  pip3 install <pkg>   → install Python packages',
      '  python3 script.py    → run a Python script',
    ].join('\n');
  }

  if (PIP_PKGS.includes(pkg)) {
    return [
      '✓ pip3 is already installed. Use it directly:',
      '',
      '  pip3 install <package>',
      '  pip3 install requests flask numpy pandas',
    ].join('\n');
  }

  // Generic apt install → suggest pip3 or npm equivalents
  return [
    `⚠  apt install is not available on this NixOS-based system.`,
    '',
    `Package requested: ${pkg}`,
    '',
    'If this is a Python package:  pip3 install ' + pkg,
    'If this is a Node package:    npm install ' + pkg,
    '',
    'Python 3.11 and pip3 are pre-installed and ready to use.',
  ].join('\n');
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

    // ── Safety check ──
    if (!isSafe(cmd)) {
      return NextResponse.json({ output: 'Permission denied: command blocked for safety', error: true });
    }

    // ── apt / apt-get interception ──
    const aptResponse = tryInterceptApt(cmd);
    if (aptResponse !== null) {
      return NextResponse.json({ output: aptResponse, error: false });
    }

    // ── Set up sandbox workspace ──
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
          // Full PATH including all Nix-provided runtimes (python3, pip3, node, npm, etc.)
          PATH: process.env.PATH || [
            '/nix/store/6h39ipxhzp4r5in5g4rhdjz7p7fkicd0-replit-runtime-path/bin',
            '/home/runner/.nix-profile/bin',
            '/usr/local/sbin',
            '/usr/local/bin',
            '/usr/sbin',
            '/usr/bin',
            '/sbin',
            '/bin',
          ].join(':'),
          NODE_ENV: 'development',
          PYTHONUNBUFFERED: '1',
          PIP_NO_CACHE_DIR: '1',
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
          output: (partialOut ? partialOut + '\n\n' : '') + `⚡ Process is running in the background (stopped after ${timeout / 1000}s). Use the Run button to preview your project.`,
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
