import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_DIR = '/tmp/nexios-workspaces';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);
  try {
    fs.mkdirSync(workspaceDir, { recursive: true });
    const body = await req.json().catch(() => ({}));
    if (body.seed && Array.isArray(body.seed)) {
      for (const file of body.seed) {
        const filePath = path.join(workspaceDir, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content || '');
      }
    }
    return NextResponse.json({ ok: true, dir: workspaceDir });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
