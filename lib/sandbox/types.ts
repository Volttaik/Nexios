export type ProjectType = 'nodejs' | 'nextjs' | 'python' | 'go' | 'shell' | 'html' | 'typescript' | 'unknown';

export type ImageName =
  | 'nexios/nodejs:20'
  | 'nexios/python:3.11'
  | 'nexios/go:1.24'
  | 'nexios/static:serve'
  | 'nexios/shell:bash';

export interface ExecutionPlan {
  projectType: ProjectType;
  image: ImageName;
  workingDir: string;
  setupCommands: string[];
  runCommand: string;
  env: Record<string, string>;
  timeout: number;
  port?: number;
  browserPreview?: {
    htmlContent: string;
    entryFile: string;
  };
}

export interface ContainerInstance {
  id: string;
  projectId: string;
  image: ImageName;
  status: 'starting' | 'running' | 'exited' | 'error';
  pid?: number;
  startedAt: number;
  exitCode?: number;
}

export interface SandboxEvent {
  type: 'stdout' | 'stderr' | 'setup' | 'info' | 'exit' | 'error';
  text: string;
  code?: number;
  timestamp: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
  timedOut: boolean;
}
