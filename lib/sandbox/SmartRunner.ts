import fs from 'fs';
import path from 'path';
import type { ExecutionPlan, ImageName, ProjectType } from './types';

interface PackageJson {
  scripts?: Record<string, string>;
  main?: string;
  name?: string;
}

export function detectExecutionPlan(
  workspaceDir: string,
  entries: string[],
  entryPoint?: string,
): ExecutionPlan {
  const entrySet = new Set(entries);

  if (entryPoint) {
    const ext = path.extname(entryPoint).slice(1).toLowerCase();

    if (ext === 'html' || ext === 'htm') {
      return buildHtmlPlan(workspaceDir, entryPoint);
    }
    if (ext === 'py') {
      return buildPythonPlan(workspaceDir, entries, entryPoint);
    }
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      return {
        projectType: 'nodejs',
        image: 'nexios/nodejs:20',
        workingDir: workspaceDir,
        setupCommands: entrySet.has('package.json') ? ['npm install --prefer-offline'] : [],
        runCommand: `node "${entryPoint}"`,
        env: { NODE_ENV: 'development' },
        timeout: 30000,
      };
    }
    if (ext === 'ts' || ext === 'tsx') {
      return {
        projectType: 'typescript',
        image: 'nexios/nodejs:20',
        workingDir: workspaceDir,
        setupCommands: entrySet.has('package.json') ? ['npm install --prefer-offline'] : [],
        runCommand: `npx --yes ts-node "${entryPoint}"`,
        env: { NODE_ENV: 'development' },
        timeout: 60000,
      };
    }
    if (ext === 'sh') {
      return {
        projectType: 'shell',
        image: 'nexios/shell:bash',
        workingDir: workspaceDir,
        setupCommands: [],
        runCommand: `bash "${entryPoint}"`,
        env: {},
        timeout: 30000,
      };
    }
  }

  if (entrySet.has('package.json')) {
    return buildNodePlan(workspaceDir, entries);
  }

  const pyEntries = ['main.py', 'app.py', 'run.py', 'server.py', 'index.py'];
  const pyMain = pyEntries.find(f => entrySet.has(f));
  if (pyMain || entries.some(f => f.endsWith('.py'))) {
    const file = pyMain || entries.find(f => f.endsWith('.py'))!;
    return buildPythonPlan(workspaceDir, entries, file);
  }

  const htmlEntries = ['index.html', 'index.htm', 'main.html'];
  const htmlMain = htmlEntries.find(f => entrySet.has(f));
  if (htmlMain) {
    return buildHtmlPlan(workspaceDir, htmlMain);
  }
  if (entries.some(f => f.endsWith('.html') || f.endsWith('.htm'))) {
    const htmlFile = entries.find(f => f.endsWith('.html') || f.endsWith('.htm'))!;
    return buildHtmlPlan(workspaceDir, htmlFile);
  }

  if (entrySet.has('go.mod')) {
    return {
      projectType: 'go',
      image: 'nexios/go:1.24',
      workingDir: workspaceDir,
      setupCommands: ['go mod download'],
      runCommand: 'go run .',
      env: { GOFLAGS: '-mod=mod' },
      timeout: 60000,
    };
  }

  const shellMain = entries.find(f => f.endsWith('.sh'));
  if (shellMain) {
    return {
      projectType: 'shell',
      image: 'nexios/shell:bash',
      workingDir: workspaceDir,
      setupCommands: [],
      runCommand: `bash "${shellMain}"`,
      env: {},
      timeout: 30000,
    };
  }

  return {
    projectType: 'unknown',
    image: 'nexios/shell:bash',
    workingDir: workspaceDir,
    setupCommands: [],
    runCommand: '',
    env: {},
    timeout: 30000,
  };
}

function buildNodePlan(workspaceDir: string, entries: string[]): ExecutionPlan {
  const entrySet = new Set(entries);
  let pkg: PackageJson = {};
  let isNextJs = false;

  try {
    const raw = fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf-8');
    pkg = JSON.parse(raw) as PackageJson;
    isNextJs =
      !!pkg.scripts?.dev?.includes('next') ||
      !!pkg.scripts?.start?.includes('next') ||
      entrySet.has('next.config.js') ||
      entrySet.has('next.config.ts') ||
      entrySet.has('next.config.mjs');
  } catch {
    pkg = {};
  }

  const projectType: ProjectType = isNextJs ? 'nextjs' : 'nodejs';
  const image: ImageName = 'nexios/nodejs:20';

  let runCommand: string;
  const setupCommands = ['npm install --prefer-offline'];

  if (pkg.scripts?.dev) {
    runCommand = 'npm run dev';
  } else if (pkg.scripts?.start) {
    runCommand = 'npm start';
  } else if (pkg.main) {
    runCommand = `node "${pkg.main}"`;
  } else {
    const nodeEntries = ['index.js', 'server.js', 'app.js', 'main.js', 'src/index.js'];
    const found = nodeEntries.find(f => entrySet.has(f));
    runCommand = found ? `node "${found}"` : 'node index.js';
  }

  const timeout = isNextJs ? 120000 : 60000;

  return {
    projectType,
    image,
    workingDir: workspaceDir,
    setupCommands,
    runCommand,
    env: { NODE_ENV: 'development' },
    timeout,
  };
}

function buildPythonPlan(workspaceDir: string, entries: string[], entryFile: string): ExecutionPlan {
  const entrySet = new Set(entries);
  const setupCommands: string[] = [];

  const hasVenv = fs.existsSync(path.join(workspaceDir, '.venv'));

  if (entrySet.has('requirements.txt')) {
    if (!hasVenv) {
      setupCommands.push('python3 -m venv .venv');
    }
    setupCommands.push('.venv/bin/pip install --quiet -r requirements.txt');
  }

  const pythonBin = (entrySet.has('requirements.txt') || hasVenv)
    ? `.venv/bin/python3`
    : 'python3';

  return {
    projectType: 'python',
    image: 'nexios/python:3.11',
    workingDir: workspaceDir,
    setupCommands,
    runCommand: `${pythonBin} "${entryFile}"`,
    env: { PYTHONUNBUFFERED: '1' },
    timeout: 60000,
  };
}

function buildHtmlPlan(workspaceDir: string, entryFile: string): ExecutionPlan {
  let htmlContent = '';
  try {
    htmlContent = fs.readFileSync(path.join(workspaceDir, entryFile), 'utf-8');
  } catch {
    htmlContent = '';
  }

  return {
    projectType: 'html',
    image: 'nexios/static:serve',
    workingDir: workspaceDir,
    setupCommands: [],
    runCommand: '',
    env: {},
    timeout: 0,
    browserPreview: {
      htmlContent,
      entryFile,
    },
  };
}
