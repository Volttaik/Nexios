import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { detectExecutionPlan } from '@/lib/sandbox/SmartRunner';
import { runSetupCommands, streamExecInSandbox } from '@/lib/sandbox/SandboxManager';
import type { SandboxEvent } from '@/lib/sandbox/types';

const BASE_DIR = '/tmp/nexios-workspaces';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspaceDir = path.join(BASE_DIR, id);

  if (!fs.existsSync(workspaceDir)) {
    return NextResponse.json({
      output: 'Workspace not initialized. Create some files first.',
      code: 1,
      runtime: 'Error',
    });
  }

  let entryPoint: string | undefined;
  try {
    const body = await req.json();
    entryPoint = body.entryPoint;
  } catch { }

  const entries = fs.readdirSync(workspaceDir);
  const plan = detectExecutionPlan(workspaceDir, entries, entryPoint);

  if (plan.projectType === 'unknown') {
    return NextResponse.json({
      output:
        'Could not detect project type. Supported: Node.js (package.json / *.js), Python (*.py / requirements.txt), HTML (*.html), Go (go.mod), Shell (*.sh).',
      code: 1,
      runtime: 'Unknown',
    });
  }

  if (plan.browserPreview) {
    return NextResponse.json({
      type: 'browser-preview',
      htmlContent: plan.browserPreview.htmlContent,
      entryFile: plan.browserPreview.entryFile,
      runtime: 'Browser',
      code: 0,
      output: `Opening ${plan.browserPreview.entryFile} in browser preview`,
      command: `preview: ${plan.browserPreview.entryFile}`,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SandboxEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch { }
      };

      send({
        type: 'info',
        text: `[Sandbox] Pulling image: ${plan.image}`,
        timestamp: Date.now(),
      });

      send({
        type: 'info',
        text: `[Sandbox] Mounting workspace /workspace → ${plan.workingDir}`,
        timestamp: Date.now(),
      });

      const imageLabels: Record<string, string> = {
        'nexios/nodejs:20': 'Node.js 20 (npm 10)',
        'nexios/python:3.11': 'Python 3.11 (pip 25)',
        'nexios/go:1.24': 'Go 1.24',
        'nexios/static:serve': 'Static Web Server',
        'nexios/shell:bash': 'Bash Shell',
      };
      send({
        type: 'info',
        text: `[Container] Image ready: ${imageLabels[plan.image] || plan.image}`,
        timestamp: Date.now(),
      });

      if (plan.setupCommands.length > 0) {
        send({
          type: 'info',
          text: '[Container] Running setup commands...',
          timestamp: Date.now(),
        });
        const ok = await runSetupCommands(plan, send);
        if (!ok) {
          send({
            type: 'exit',
            text: '[Container] Setup failed — container stopped',
            code: 1,
            timestamp: Date.now(),
          });
          try { controller.close(); } catch { }
          return;
        }
        send({
          type: 'info',
          text: '[Container] Setup complete',
          timestamp: Date.now(),
        });
      }

      await new Promise<void>(resolve => {
        streamExecInSandbox(plan, event => {
          send(event);
          if (event.type === 'exit') resolve();
        });
      });

      try { controller.close(); } catch { }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
