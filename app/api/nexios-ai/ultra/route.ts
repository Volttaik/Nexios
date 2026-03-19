import { NextRequest, NextResponse } from 'next/server';
import { getUltra } from '../../../../nexios-ai/ultra/ultra-mode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action?: string };

    const ultra = getUltra();

    if (action === 'start') {
      const started = ultra.start();
      return NextResponse.json({
        success: started,
        message: started ? 'Ultra Mode activated — autonomous learning started' : 'Ultra Mode already active',
        status: ultra.getStatus(),
      });
    }

    if (action === 'stop') {
      ultra.stop();
      return NextResponse.json({
        success: true,
        message: 'Ultra Mode stopped',
        status: ultra.getStatus(),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop"' }, { status: 400 });
  } catch (e) {
    console.error('[/api/nexios-ai/ultra]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  const ultra = getUltra();
  return NextResponse.json({ status: ultra.getStatus() });
}
