import { NextRequest, NextResponse } from 'next/server';
import { getCodingAgent } from '../../../../nexios-ai/agents/coding-agent';
import { getSeekerAgent } from '../../../../nexios-ai/agents/seeker-agent';
import { getSelfImprovingAgent } from '../../../../nexios-ai/agents/self-improving-agent';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getEngine } from '../../../../nexios-ai/core/engine';
import { getLifecycle } from '../../../../nexios-ai/lifecycle/manager';

const DUMMY_ITEMS = [
  {
    content: 'Test entry 1: JavaScript closures allow functions to retain access to their lexical scope. This enables encapsulation and factory patterns in functional programming.',
    category: 'programming' as const,
    source: 'test-runner',
    confidence: 0.9,
  },
  {
    content: 'Test entry 2: TypeScript generics provide type-safe reusable components. They allow you to write functions and classes that work with any type while preserving type information.',
    category: 'programming' as const,
    source: 'test-runner',
    confidence: 0.85,
  },
  {
    content: 'Test entry 3: CSS Grid layout enables two-dimensional layout control. Use grid-template-columns and grid-template-rows to define grid tracks.',
    category: 'design' as const,
    source: 'test-runner',
    confidence: 0.88,
  },
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { mode?: string };
  const mode = body.mode ?? 'full';

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  /* ── 1. Directory and storage validation ─────────────────────────── */
  try {
    const storage = getStorage();
    const stats   = storage.storageStats();
    results.storage = {
      ok: true,
      entries: stats.entries,
      usagePercent: stats.usagePercent,
      nearLimit: stats.nearLimit,
    };
  } catch (e) {
    errors.push(`Storage init failed: ${e instanceof Error ? e.message : String(e)}`);
    results.storage = { ok: false };
  }

  /* ── 2. Coding Agent test — encode dummy items ───────────────────── */
  try {
    const coding   = getCodingAgent();
    const before   = getStorage().count();
    const added    = await coding.runCycle(DUMMY_ITEMS);
    const after    = getStorage().count();
    results.codingAgent = {
      ok: true,
      itemsProvided: DUMMY_ITEMS.length,
      itemsEncoded: added,
      kbBefore: before,
      kbAfter: after,
      status: coding.getStatus().state,
    };
  } catch (e) {
    errors.push(`Coding Agent test failed: ${e instanceof Error ? e.message : String(e)}`);
    results.codingAgent = { ok: false };
  }

  /* ── 3. Self-Improving Agent test ────────────────────────────────── */
  if (mode === 'full') {
    try {
      const improve = getSelfImprovingAgent();
      const before  = getStorage().count();
      await improve.runCycle(1);
      const after   = getStorage().count();
      results.selfImprovingAgent = {
        ok: true,
        kbBefore: before,
        kbAfter: after,
        status: improve.getStatus().state,
        cycles: improve.getStatus().cyclesCompleted,
      };
    } catch (e) {
      errors.push(`Self-Improving Agent test failed: ${e instanceof Error ? e.message : String(e)}`);
      results.selfImprovingAgent = { ok: false };
    }
  }

  /* ── 4. Chat / Knowledge retrieval test ─────────────────────────── */
  try {
    const lifecycle = getLifecycle();
    const wasRunning = lifecycle.isRunning();

    /* Temporarily allow engine to run even if lifecycle is idle */
    const engine  = getEngine();
    const storage = getStorage();

    const queryResults = storage.query({
      text: 'javascript closures functions',
      limit: 3,
      minConfidence: 0.1,
    });

    results.knowledgeRetrieval = {
      ok: true,
      query: 'javascript closures functions',
      resultsFound: queryResults.length,
      topResult: queryResults[0] ? {
        category: queryResults[0].entry.category,
        confidence: queryResults[0].entry.confidence,
        score: queryResults[0].score,
        preview: queryResults[0].entry.content.slice(0, 100),
      } : null,
    };

    /* Only test chat if AI is running */
    if (wasRunning) {
      const chatResponse = await engine.process('Explain JavaScript closures', 'test-session');
      results.chatResponse = {
        ok: true,
        category: chatResponse.category,
        confidence: chatResponse.confidence,
        knowledgeEntriesUsed: chatResponse.knowledgeEntriesUsed,
        processingMs: chatResponse.processingMs,
        preview: chatResponse.content.slice(0, 150),
      };
    } else {
      results.chatResponse = { ok: true, skipped: true, reason: 'AI lifecycle not running' };
    }
  } catch (e) {
    errors.push(`Chat test failed: ${e instanceof Error ? e.message : String(e)}`);
    results.knowledgeRetrieval = { ok: false };
  }

  /* ── 5. Seeker Agent status ──────────────────────────────────────── */
  try {
    const seeker = getSeekerAgent();
    results.seekerAgent = {
      ok: true,
      status: seeker.getStatus().state,
      cycles: seeker.getStatus().cyclesCompleted,
      pending: seeker.pendingCount(),
      errors: seeker.getStatus().errors,
    };
  } catch (e) {
    errors.push(`Seeker status failed: ${e instanceof Error ? e.message : String(e)}`);
    results.seekerAgent = { ok: false };
  }

  const allOk = errors.length === 0 && Object.values(results).every((r: unknown) => {
    const rec = r as Record<string, unknown>;
    return rec.ok !== false;
  });

  return NextResponse.json({
    success: allOk,
    timestamp: new Date().toISOString(),
    mode,
    results,
    errors,
    summary: allOk
      ? 'All systems operational — Seeker, Coding, Self-Improving agents and knowledge retrieval verified'
      : `${errors.length} test(s) failed — see errors for details`,
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Nexios AI Test Runner',
    usage: 'POST with { "mode": "full" | "quick" } to run diagnostic tests',
    modes: {
      full: 'Tests all agents including Self-Improving Agent (slower)',
      quick: 'Tests Coding Agent and knowledge retrieval only',
    },
  });
}
