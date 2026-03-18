import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_DIR = '/tmp/nexios-workspaces';

function getDir(id: string) {
  const dir = path.join(BASE_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizePath(base: string, filePath: string): string {
  const resolved = path.resolve(base, filePath);
  if (!resolved.startsWith(base)) throw new Error('Path traversal denied');
  return resolved;
}

function readDirRecursive(dirPath: string, base: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, item.name);
      const relPath = path.relative(base, fullPath);
      if (item.isDirectory()) {
        const sub = readDirRecursive(fullPath, base);
        Object.assign(result, sub);
      } else {
        try {
          result[relPath] = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          result[relPath] = '';
        }
      }
    }
  } catch { /* ignore */ }
  return result;
}

// GET — list all files with their content
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = getDir(id);
  const files = readDirRecursive(dir, dir);
  return NextResponse.json({ files });
}

// POST — create or update a file
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = getDir(id);
  try {
    const { path: filePath, content } = await req.json();
    if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 });
    const abs = sanitizePath(dir, filePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content ?? '');
    return NextResponse.json({ ok: true, path: filePath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a file or directory
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = getDir(id);
  try {
    const { path: filePath } = await req.json();
    if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 });
    const abs = sanitizePath(dir, filePath);
    if (fs.existsSync(abs)) {
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) fs.rmSync(abs, { recursive: true, force: true });
      else fs.unlinkSync(abs);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — rename/move a file
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = getDir(id);
  try {
    const { from, to } = await req.json();
    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 });
    const absFrom = sanitizePath(dir, from);
    const absTo = sanitizePath(dir, to);
    fs.mkdirSync(path.dirname(absTo), { recursive: true });
    fs.renameSync(absFrom, absTo);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
