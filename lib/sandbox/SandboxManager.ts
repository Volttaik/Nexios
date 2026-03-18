import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import type { ContainerInstance, ExecutionPlan, ExecResult, SandboxEvent } from './types';
import { SANDBOX_ENV } from './RuntimeRegistry';

const execAsync = promisify(exec);

const MAX_BUFFER = 1024 * 1024 * 10;

const containers = new Map<string, ContainerInstance>();

export function getContainer(id: string): ContainerInstance | undefined {
  return containers.get(id);
}

export function listContainers(): ContainerInstance[] {
  return Array.from(containers.values());
}

export function stopContainer(id: string): void {
  const c = containers.get(id);
  if (c && c.pid) {
    try {
      process.kill(c.pid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(c.pid!, 'SIGKILL'); } catch { }
      }, 3000);
    } catch { }
  }
  containers.delete(id);
}

export async function runSetupCommands(
  plan: ExecutionPlan,
  onOutput: (event: SandboxEvent) => void,
): Promise<boolean> {
  for (const cmd of plan.setupCommands) {
    onOutput({
      type: 'setup',
      text: `[Setup] $ ${cmd}`,
      timestamp: Date.now(),
    });
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: plan.workingDir,
        timeout: 120000,
        env: { ...SANDBOX_ENV, ...plan.env },
        maxBuffer: MAX_BUFFER,
      });
      if (stdout.trim()) {
        stdout.split('\n').filter(Boolean).forEach(line =>
          onOutput({ type: 'setup', text: `  ${line}`, timestamp: Date.now() }),
        );
      }
      if (stderr.trim()) {
        stderr.split('\n').filter(Boolean).forEach(line =>
          onOutput({ type: 'setup', text: `  ${line}`, timestamp: Date.now() }),
        );
      }
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      const out = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n');
      onOutput({ type: 'error', text: `[Setup Error] ${out}`, timestamp: Date.now() });
      return false;
    }
  }
  return true;
}

export function execInSandbox(plan: ExecutionPlan): Promise<ExecResult> {
  return new Promise(resolve => {
    const child = spawn('sh', ['-c', plan.runCommand], {
      cwd: plan.workingDir,
      env: { ...SANDBOX_ENV, ...plan.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch { }
    }, plan.timeout);

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1, timedOut });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, code: 1, timedOut: false });
    });
  });
}

export function streamExecInSandbox(
  plan: ExecutionPlan,
  onEvent: (e: SandboxEvent) => void,
): () => void {
  const containerId = randomUUID();
  const instance: ContainerInstance = {
    id: containerId,
    projectId: plan.workingDir,
    image: plan.image,
    status: 'starting',
    startedAt: Date.now(),
  };
  containers.set(containerId, instance);

  onEvent({
    type: 'info',
    text: `[Container ${containerId.slice(0, 8)}] Starting image: ${plan.image}`,
    timestamp: Date.now(),
  });

  const child = spawn('sh', ['-c', plan.runCommand], {
    cwd: plan.workingDir,
    env: { ...SANDBOX_ENV, ...plan.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  instance.pid = child.pid;
  instance.status = 'running';
  containers.set(containerId, { ...instance });

  onEvent({
    type: 'info',
    text: `[Container ${containerId.slice(0, 8)}] Running: ${plan.runCommand}`,
    timestamp: Date.now(),
  });

  const timer = setTimeout(() => {
    onEvent({
      type: 'error',
      text: `[Container] Timeout after ${plan.timeout / 1000}s — container killed`,
      timestamp: Date.now(),
    });
    try { child.kill('SIGKILL'); } catch { }
  }, plan.timeout);

  child.stdout.on('data', (d: Buffer) => {
    d.toString().split('\n').forEach(line => {
      if (line !== '') onEvent({ type: 'stdout', text: line, timestamp: Date.now() });
    });
  });

  child.stderr.on('data', (d: Buffer) => {
    d.toString().split('\n').forEach(line => {
      if (line !== '') onEvent({ type: 'stderr', text: line, timestamp: Date.now() });
    });
  });

  child.on('close', code => {
    clearTimeout(timer);
    const c = containers.get(containerId);
    if (c) {
      containers.set(containerId, { ...c, status: 'exited', exitCode: code ?? 0 });
    }
    onEvent({
      type: 'exit',
      text: `[Container ${containerId.slice(0, 8)}] Exited with code ${code ?? 0}`,
      code: code ?? 0,
      timestamp: Date.now(),
    });
  });

  child.on('error', err => {
    clearTimeout(timer);
    const c = containers.get(containerId);
    if (c) containers.set(containerId, { ...c, status: 'error' });
    onEvent({ type: 'error', text: `[Container] Error: ${err.message}`, timestamp: Date.now() });
    onEvent({ type: 'exit', text: 'Container failed to start', code: 1, timestamp: Date.now() });
  });

  return () => {
    clearTimeout(timer);
    try { child.kill('SIGTERM'); } catch { }
    containers.delete(containerId);
  };
}

export async function runCommandInSandbox(
  workspaceDir: string,
  command: string,
  timeoutMs = 30000,
): Promise<ExecResult> {
  return new Promise(resolve => {
    const child = spawn('sh', ['-c', command], {
      cwd: workspaceDir,
      env: SANDBOX_ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch { }
    }, timeoutMs);

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', code => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1, timedOut });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, code: 1, timedOut: false });
    });
  });
}
