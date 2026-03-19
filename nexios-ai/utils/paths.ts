import path from 'path';

const isReadOnlyFs =
  !!process.env.VERCEL ||
  process.cwd().startsWith('/var/task');

export const DATA_DIR: string = isReadOnlyFs
  ? '/tmp/nexios-ai'
  : path.join(process.cwd(), 'data', 'nexios-ai');
