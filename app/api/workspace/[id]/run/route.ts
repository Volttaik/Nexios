import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const BASE_DIR = '/tmp/nexios-workspaces';

function detectRunCommand(files: string[]): { command: string; runtime: string } | null {
  if (files.includes('package.json')) {
    return { command: 'node index.js 2>&1 || node src/index.js 2>&1 || npx ts-node index.ts 2>&1 || echo "No entry point found"', runtime: 'Node.js' };
  }
  if (files.some(f => f.endsWith('.py'))) {
    const main = files.find(f => f === 'main.py') || files.find(f => f.endsWith('.py'));
    return { command: `python3 ${main} 2>&1`, runtime: 'Python' };
  }
  if (files.includes('go.mod')) {
    return { command: 'go run . 2>&1', runtime: 'Go' };
  }
  if (files.some(f => f.endsWith('.sh'))) {
    const main = files.find(f => f.endsWith('.sh'));
    return { command: `bash ${main} 2>&1`, runtime: 'Shell' };
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);

  if (!fs.existsSync(workspaceDir)) {
    return NextResponse.json({ output: 'Workspace not initialized. Create some files first.', code: 1 });
  }

  let entryPoint: string | undefined;
  let customCommand: string | undefined;
  try {
    const body = await req.json();
    entryPoint = body.entryPoint;
    customCommand = body.command;
  } catch { /* ignore */ }

  try {
    const entries = fs.readdirSync(workspaceDir);

    let command: string;
    let runtime: string;

    if (customCommand) {
      command = customCommand;
      runtime = 'Custom';
    } else if (entryPoint) {
      const ext = path.extname(entryPoint).slice(1);
      if (ext === 'py') { command = `python3 ${entryPoint} 2>&1`; runtime = 'Python'; }
      else if (ext === 'js' || ext === 'mjs') { command = `node ${entryPoint} 2>&1`; runtime = 'Node.js'; }
      else if (ext === 'ts') { command = `npx ts-node ${entryPoint} 2>&1`; runtime = 'TypeScript'; }
      else if (ext === 'sh') { command = `bash ${entryPoint} 2>&1`; runtime = 'Shell'; }
      else { command = `./${entryPoint} 2>&1`; runtime = 'Binary'; }
    } else {
      const detected = detectRunCommand(entries);
      if (!detected) {
        return NextResponse.json({ output: 'Could not detect project type. Please specify an entry file.', code: 1, runtime: 'Unknown' });
      }
      command = detected.command;
      runtime = detected.runtime;

      if (entries.includes('package.json')) {
        try {
          const pkgJson = JSON.parse(fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf-8'));
          if (pkgJson.scripts?.start) { command = 'npm start 2>&1'; }
          else if (pkgJson.scripts?.dev) { command = 'npm run dev 2>&1'; }
          else if (pkgJson.main) { command = `node ${pkgJson.main} 2>&1`; }
        } catch { /* ignore */ }
      }
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceDir,
      timeout: 30000,
      env: {
        ...process.env,
        HOME: workspaceDir,
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/nix/var/nix/profiles/default/bin',
        NODE_ENV: 'development',
      },
      maxBuffer: 1024 * 1024 * 5,
    });

    const output = [stdout, stderr].filter(Boolean).join('\n');
    return NextResponse.json({ output: output || '(no output)', code: 0, runtime, command });
  } catch (err: any) {
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
    return NextResponse.json({ output: output || 'Run failed', code: err.code || 1, runtime: 'Error', command: '' });
  }
}
