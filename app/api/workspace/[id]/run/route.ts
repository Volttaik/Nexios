import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const BASE_DIR = '/tmp/nexios-workspaces';

const NIX_PATH = [
  '/root/.nix-profile/bin',
  '/nix/var/nix/profiles/default/bin',
  '/usr/local/sbin',
  '/usr/local/bin',
  '/usr/sbin',
  '/usr/bin',
  '/sbin',
  '/bin',
].join(':');

type ProjectType = 'nodejs' | 'python' | 'go' | 'shell' | 'html' | 'unknown';

interface RunPlan {
  type: ProjectType;
  command?: string;
  runtime: string;
  entryFile?: string;
}

function detectProjectType(workspaceDir: string, entries: string[], entryPoint?: string): RunPlan {
  // If a specific entry point is provided, use file extension to decide
  if (entryPoint) {
    const ext = path.extname(entryPoint).slice(1).toLowerCase();

    if (ext === 'html' || ext === 'htm') {
      return { type: 'html', runtime: 'Browser', entryFile: entryPoint };
    }
    if (ext === 'py') {
      return { type: 'python', command: `python3 "${entryPoint}" 2>&1`, runtime: 'Python', entryFile: entryPoint };
    }
    if (ext === 'js' || ext === 'mjs') {
      return { type: 'nodejs', command: `node "${entryPoint}" 2>&1`, runtime: 'Node.js', entryFile: entryPoint };
    }
    if (ext === 'ts') {
      return { type: 'nodejs', command: `npx --yes ts-node "${entryPoint}" 2>&1`, runtime: 'TypeScript', entryFile: entryPoint };
    }
    if (ext === 'sh') {
      return { type: 'shell', command: `bash "${entryPoint}" 2>&1`, runtime: 'Shell', entryFile: entryPoint };
    }
    // Fallback for unknown extension
    return { type: 'unknown', command: `"./${entryPoint}" 2>&1`, runtime: 'Binary', entryFile: entryPoint };
  }

  // Auto-detect based on workspace contents

  // Node.js detection
  if (entries.includes('package.json')) {
    try {
      const pkgPath = path.join(workspaceDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      let command: string;
      if (pkg.scripts?.start) {
        command = 'npm start 2>&1';
      } else if (pkg.scripts?.dev) {
        command = 'npm run dev 2>&1';
      } else if (pkg.main) {
        command = `node "${pkg.main}" 2>&1`;
      } else {
        // Try common entry points
        const nodeEntries = ['index.js', 'server.js', 'app.js', 'main.js', 'src/index.js'];
        const found = nodeEntries.find(f => entries.includes(f) || fs.existsSync(path.join(workspaceDir, f)));
        command = found ? `node "${found}" 2>&1` : 'node index.js 2>&1';
      }

      return { type: 'nodejs', command, runtime: 'Node.js' };
    } catch {
      return { type: 'nodejs', command: 'node index.js 2>&1', runtime: 'Node.js' };
    }
  }

  // Python detection
  const pythonEntries = ['main.py', 'app.py', 'run.py', 'server.py', 'index.py'];
  const pythonMain = pythonEntries.find(f => entries.includes(f));
  if (pythonMain) {
    return { type: 'python', command: `python3 "${pythonMain}" 2>&1`, runtime: 'Python', entryFile: pythonMain };
  }
  if (entries.some(f => f.endsWith('.py'))) {
    const pyFile = entries.find(f => f.endsWith('.py'))!;
    return { type: 'python', command: `python3 "${pyFile}" 2>&1`, runtime: 'Python', entryFile: pyFile };
  }

  // HTML detection
  const htmlEntries = ['index.html', 'index.htm', 'main.html'];
  const htmlMain = htmlEntries.find(f => entries.includes(f));
  if (htmlMain) {
    return { type: 'html', runtime: 'Browser', entryFile: htmlMain };
  }
  if (entries.some(f => f.endsWith('.html') || f.endsWith('.htm'))) {
    const htmlFile = entries.find(f => f.endsWith('.html') || f.endsWith('.htm'))!;
    return { type: 'html', runtime: 'Browser', entryFile: htmlFile };
  }

  // Go detection
  if (entries.includes('go.mod')) {
    return { type: 'go', command: 'go run . 2>&1', runtime: 'Go' };
  }

  // Shell detection
  const shellMain = entries.find(f => f.endsWith('.sh'));
  if (shellMain) {
    return { type: 'shell', command: `bash "${shellMain}" 2>&1`, runtime: 'Shell', entryFile: shellMain };
  }

  return { type: 'unknown', runtime: 'Unknown' };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);

  if (!fs.existsSync(workspaceDir)) {
    return NextResponse.json({ output: 'Workspace not initialized. Create some files first.', code: 1, runtime: 'Error' });
  }

  let entryPoint: string | undefined;
  let customCommand: string | undefined;
  try {
    const body = await req.json();
    entryPoint = body.entryPoint;
    customCommand = body.command;
  } catch { }

  try {
    const entries = fs.readdirSync(workspaceDir);

    // Custom command override
    if (customCommand) {
      const { stdout, stderr } = await execAsync(customCommand, {
        cwd: workspaceDir,
        timeout: 30000,
        env: { ...process.env, HOME: workspaceDir, PATH: NIX_PATH, NODE_ENV: 'development' },
        maxBuffer: 1024 * 1024 * 5,
      });
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return NextResponse.json({ output: output || '(no output)', code: 0, runtime: 'Custom', command: customCommand });
    }

    const plan = detectProjectType(workspaceDir, entries, entryPoint);

    // HTML files open in browser preview — never execute as scripts
    if (plan.type === 'html') {
      const htmlFile = plan.entryFile!;
      const htmlPath = path.join(workspaceDir, htmlFile);

      let htmlContent = '';
      try {
        htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      } catch {
        return NextResponse.json({
          type: 'error',
          output: `Could not read HTML file: ${htmlFile}`,
          code: 1,
          runtime: 'Browser',
        });
      }

      return NextResponse.json({
        type: 'browser-preview',
        htmlContent,
        entryFile: htmlFile,
        runtime: 'Browser',
        code: 0,
        output: `Opening ${htmlFile} in browser preview`,
        command: `preview: ${htmlFile}`,
      });
    }

    if (plan.type === 'unknown') {
      return NextResponse.json({
        output: 'Could not detect project type. Supported: Node.js (package.json / *.js), Python (*.py), HTML (*.html), Go (go.mod), Shell (*.sh).',
        code: 1,
        runtime: 'Unknown',
      });
    }

    const { stdout, stderr } = await execAsync(plan.command!, {
      cwd: workspaceDir,
      timeout: 30000,
      env: {
        ...process.env,
        HOME: workspaceDir,
        PATH: NIX_PATH,
        NODE_ENV: 'development',
      },
      maxBuffer: 1024 * 1024 * 5,
    });

    const output = [stdout, stderr].filter(Boolean).join('\n');
    return NextResponse.json({ output: output || '(no output)', code: 0, runtime: plan.runtime, command: plan.command });
  } catch (err: any) {
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
    return NextResponse.json({ output: output || 'Run failed', code: err.code || 1, runtime: 'Error', command: '' });
  }
}
