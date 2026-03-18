import { execSync } from 'child_process';

function resolvebin(name: string): string {
  try {
    const result = execSync(`which ${name} 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 3000,
      env: process.env,
    }).trim();
    return result || name;
  } catch {
    return name;
  }
}

export const NODE_BIN = resolvebin('node');
export const NPM_BIN = resolvebin('npm');
export const PYTHON3_BIN = resolvebin('python3');
export const PIP3_BIN = resolvebin('pip3');
export const GO_BIN = resolvebin('go');
export const BASH_BIN = resolvebin('bash');
export const NPXBIN = resolvebin('npx');

export const SANDBOX_PATH = process.env.PATH || [
  '/nix/var/nix/profiles/default/bin',
  '/home/runner/.nix-profile/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
].join(':');

export const SANDBOX_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PYTHONUNBUFFERED: '1',
  NPM_CONFIG_LOGLEVEL: 'warn',
  PATH: SANDBOX_PATH,
};
