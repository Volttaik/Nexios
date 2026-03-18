import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const BASE_DIR = '/tmp/nexios-workspaces';

// Detect LibreOffice binary
async function getLibreOfficeBin(): Promise<string | null> {
  const candidates = [
    'libreoffice', 'soffice',
    '/nix/var/nix/profiles/default/bin/libreoffice',
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/libreoffice',
  ];
  for (const bin of candidates) {
    try {
      await execAsync(`which ${bin} 2>/dev/null || ${bin} --version 2>/dev/null`);
      return bin;
    } catch { /* try next */ }
  }
  return null;
}

// POST — convert a document using LibreOffice headless
// Body: { filename: string, content: string (base64), format: 'html'|'pdf'|'txt' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);
  fs.mkdirSync(workspaceDir, { recursive: true });

  try {
    const { filename, content, format = 'html' } = await req.json();
    if (!filename || !content) {
      return NextResponse.json({ error: 'filename and content required' }, { status: 400 });
    }

    const inputPath = path.join(workspaceDir, filename);
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(inputPath, buffer);

    const loBin = await getLibreOfficeBin();
    if (!loBin) {
      return NextResponse.json({
        available: false,
        message: 'LibreOffice is not installed. Install it by adding "libreoffice" to your Nix packages.',
        fallback: 'text',
      });
    }

    const outDir = path.join(workspaceDir, '.lo-out');
    fs.mkdirSync(outDir, { recursive: true });

    await execAsync(`${loBin} --headless --convert-to ${format} "${inputPath}" --outdir "${outDir}"`, {
      timeout: 60000,
      env: {
        ...process.env,
        HOME: workspaceDir,
      },
    });

    const baseName = path.basename(filename, path.extname(filename));
    const outFile = path.join(outDir, `${baseName}.${format}`);

    if (!fs.existsSync(outFile)) {
      return NextResponse.json({ error: 'Conversion failed — output not found' }, { status: 500 });
    }

    const result = fs.readFileSync(outFile, format === 'pdf' ? undefined : 'utf-8');
    const resultBase64 = format === 'pdf' ? result.toString('base64') : null;

    return NextResponse.json({
      available: true,
      format,
      content: format === 'pdf' ? resultBase64 : result,
      encoding: format === 'pdf' ? 'base64' : 'utf-8',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — check if LibreOffice is available
export async function GET() {
  const loBin = await getLibreOfficeBin();
  if (loBin) {
    try {
      const { stdout } = await execAsync(`${loBin} --version`);
      return NextResponse.json({ available: true, version: stdout.trim(), bin: loBin });
    } catch {
      return NextResponse.json({ available: true, bin: loBin });
    }
  }
  return NextResponse.json({
    available: false,
    message: 'Add "libreoffice" to your Nix packages in .replit to enable document conversion.',
  });
}
