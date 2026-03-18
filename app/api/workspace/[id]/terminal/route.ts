import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runCommandInSandbox } from '@/lib/sandbox/SandboxManager';

const BASE_DIR = '/tmp/nexios-workspaces';

const BLOCKED_PATTERNS = [
  'sudo',
  'su ',
  'passwd',
  'shutdown',
  'reboot',
  'halt',
  'init ',
  'systemctl',
  'rm -rf /',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
];

function isBlocked(cmd: string): boolean {
  return BLOCKED_PATTERNS.some(p => cmd.includes(p));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);
  fs.mkdirSync(workspaceDir, { recursive: true });

  let command: string;
  try {
    const body = await req.json();
    command = (body.command ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!command) {
    return NextResponse.json({ stdout: '', stderr: '', code: 0 });
  }

  if (isBlocked(command)) {
    return NextResponse.json({
      stdout: '',
      stderr: `Command blocked for security: ${command.split(' ')[0]}`,
      code: 1,
    });
  }

  const result = await runCommandInSandbox(workspaceDir, command, 60000);

  if (result.timedOut) {
    return NextResponse.json({
      stdout: result.stdout,
      stderr: 'Command timed out after 60s — container killed',
      code: 124,
    });
  }

  return NextResponse.json({
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  });
}
