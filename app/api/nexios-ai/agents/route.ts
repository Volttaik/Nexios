import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/nexios-ai/agents/orchestrator';
import { getSeekerAgent } from '@/nexios-ai/agents/seeker-agent';
import { getCodingAgent } from '@/nexios-ai/agents/coding-agent';
import { getSelfImprovingAgent } from '@/nexios-ai/agents/self-improving-agent';

export async function GET() {
  const orchestrator = getOrchestrator();
  const status = orchestrator.getStatus();

  /* Ensure per-agent statuses are fresh */
  status.agents.seeker          = getSeekerAgent().getStatus();
  status.agents.coding          = getCodingAgent().getStatus();
  status['agents']['self-improving'] = getSelfImprovingAgent().getStatus();

  return NextResponse.json(status);
}
