import { NextResponse } from 'next/server';
import { getOrchestrator } from '../../../../nexios-ai/agents/orchestrator';
import { getSeekerAgent } from '../../../../nexios-ai/agents/seeker-agent';
import { getCodingAgent } from '../../../../nexios-ai/agents/coding-agent';
import { getSelfImprovingAgent } from '../../../../nexios-ai/agents/self-improving-agent';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getLifecycle } from '../../../../nexios-ai/lifecycle/manager';
import { getCheckpoints } from '../../../../nexios-ai/checkpoint/checkpoint';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../../../../nexios-ai/utils/paths';

const ERR_LOG = path.join(DATA_DIR, 'errors.log');

function readErrorLog(maxLines = 50): string[] {
  try {
    if (!fs.existsSync(ERR_LOG)) return [];
    const content = fs.readFileSync(ERR_LOG, 'utf-8');
    return content.trim().split('\n').filter(Boolean).slice(-maxLines).reverse();
  } catch {
    return [];
  }
}

export async function GET() {
  const orchestrator = getOrchestrator();
  const seeker       = getSeekerAgent();
  const coding       = getCodingAgent();
  const improve      = getSelfImprovingAgent();
  const storage      = getStorage();
  const lifecycle    = getLifecycle();
  const checkpoints  = getCheckpoints();

  const orchStatus  = orchestrator.getStatus();
  const storStats   = storage.storageStats();
  const lc          = lifecycle.getStatus();

  const agentSummary = [
    { ...seeker.getStatus(),  name: 'Seeker' },
    { ...coding.getStatus(),  name: 'Coding' },
    { ...improve.getStatus(), name: 'Self-Improving' },
  ].map(a => ({
    name:           a.name,
    state:          a.state,
    cyclesCompleted: a.cyclesCompleted,
    itemsProcessed: a.itemsProcessed,
    errors:         a.errors,
    lastRunAt:      a.lastRunAt,
    currentTask:    a.currentTask,
  }));

  /* Identify failed cycles */
  const failedAgents = agentSummary.filter(a => a.state === 'error');

  return NextResponse.json({
    timestamp: Date.now(),
    lifecycle: {
      state:           lc.state,
      learningEnabled: lc.learningEnabled,
      startedAt:       lc.startedAt,
      uptimeMs:        lc.startedAt ? Date.now() - lc.startedAt : 0,
    },
    orchestrator: {
      running:             orchStatus.running,
      cycleCount:          orchStatus.cycleCount,
      totalItemsProcessed: orchStatus.totalItemsProcessed,
      currentAgent:        orchStatus.currentAgent,
    },
    agents: agentSummary,
    failedAgents,
    storage: {
      ...storStats,
      byCategory: storage.countByCategory(),
    },
    checkpoints: {
      count:   checkpoints.length,
      latest:  checkpoints.length ? checkpoints[checkpoints.length - 1] : null,
    },
    recentErrors: readErrorLog(20),
    health: {
      ok:         failedAgents.length === 0,
      warnings:   storStats.nearLimit ? ['Knowledge base approaching capacity'] : [],
      failedAgents: failedAgents.map(a => a.name),
    },
  });
}
