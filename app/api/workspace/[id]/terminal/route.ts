import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const BASE_DIR = '/tmp/nexios-workspaces';

// Commands that should never be allowed
const BLOCKED = ['sudo', 'su', 'passwd', 'shutdown', 'reboot', 'halt', 'init', 'systemctl', 'rm -rf /'];

function isBlocked(cmd: string): boolean {
  return BLOCKED.some(b => cmd.includes(b));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);
  fs.mkdirSync(workspaceDir, { recursive: true });

  let command: string;
  try {
    const body = await req.json();
    command = body.command?.trim() || '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!command) return NextResponse.json({ stdout: '', stderr: '', code: 0 });

  if (isBlocked(command)) {
    return NextResponse.json({ stdout: '', stderr: `Command blocked for security: ${command.split(' ')[0]}`, code: 1 });
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceDir,
      timeout: 30000,
      env: {
        ...process.env,
        HOME: workspaceDir,
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/nix/var/nix/profiles/default/bin',
      },
      maxBuffer: 1024 * 1024 * 5,
    });
    return NextResponse.json({ stdout, stderr, code: 0 });
  } catch (err: any) {
    const stdout = err.stdout || '';
    const stderr = err.stderr || err.message || 'Command failed';
    const code = err.code || 1;
    return NextResponse.json({ stdout, stderr, code });
  }
}
