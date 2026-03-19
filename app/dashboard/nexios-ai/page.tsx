'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BsPlay, BsStop, BsPause, BsLightning, BsBroadcast, BsDatabase,
  BsGearFill, BsArrowRepeat, BsSearch, BsCodeSlash, BsCpu,
  BsChatDotsFill, BsChevronDown, BsChevronRight, BsCircleFill,
} from 'react-icons/bs';
import { HiSparkles } from 'react-icons/hi';

/* ── Types ────────────────────────────────────────────────────────────── */
type AIState = 'idle' | 'starting' | 'running' | 'paused';

interface LifecycleStatus {
  state: AIState;
  learningEnabled: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  stateChangedAt: number;
}

interface AgentStatus {
  name: string;
  state: 'idle' | 'running' | 'completed' | 'error';
  cyclesCompleted: number;
  itemsProcessed: number;
  lastRunAt: number | null;
  currentTask: string | null;
  errors: number;
  log: string[];
}

interface OrchestratorStatus {
  running: boolean;
  currentAgent: string | null;
  cycleCount: number;
  totalItemsProcessed: number;
  startedAt: number | null;
  learningEnabled: boolean;
  agents: Record<string, AgentStatus>;
}

interface KnowledgeStats {
  total: number;
  byCategory: Record<string, number>;
  availableDatasets: number;
  datasetNames: string[];
}

interface ChatMsg { role: 'user' | 'ai'; text: string; ts: number; category?: string; confidence?: number }

/* ── Helpers ──────────────────────────────────────────────────────────── */
const STATE_COLORS: Record<AIState, string> = {
  idle:     '#64748b',
  starting: '#f59e0b',
  running:  '#10b981',
  paused:   '#6366f1',
};
const STATE_LABELS: Record<AIState, string> = {
  idle:     'Idle',
  starting: 'Starting…',
  running:  'Running',
  paused:   'Paused Learning',
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  seeker:           <BsSearch className="w-4 h-4" />,
  coding:           <BsCodeSlash className="w-4 h-4" />,
  'self-improving': <BsCpu className="w-4 h-4" />,
};

const AGENT_LABELS: Record<string, string> = {
  seeker:           'Seeker Agent',
  coding:           'Coding Agent',
  'self-improving': 'Self-Improving Agent',
};

const AGENT_DESCS: Record<string, string> = {
  seeker:           'Searches the web & fetches datasets continuously',
  coding:           'Encodes & stores knowledge into the structured database',
  'self-improving': 'Deduplicates, merges & optimises knowledge retrieval',
};

function AgentStateIndicator({ state }: { state: AgentStatus['state'] }) {
  const c = state === 'running' ? '#10b981' : state === 'error' ? '#ef4444' : state === 'completed' ? '#6366f1' : '#475569';
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c }}>
      <BsCircleFill className={`w-1.5 h-1.5 ${state === 'running' ? 'animate-pulse' : ''}`} />
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

interface TestResult { success: boolean; summary: string; results: Record<string, unknown>; errors: string[] }
interface MonitorData { health: { ok: boolean; warnings: string[]; failedAgents: string[] }; recentErrors: string[]; storage: { usagePercent: number; nearLimit: boolean; entries: number; maxEntries: number }; checkpoints: { count: number } }

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function NexiosAIPage() {
  const [lifecycle, setLifecycle] = useState<LifecycleStatus | null>(null);
  const [orchestrator, setOrchestrator] = useState<OrchestratorStatus | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeStats | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  /* Test cycle */
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showTest, setShowTest] = useState(false);

  /* Monitoring */
  const [monitor, setMonitor] = useState<MonitorData | null>(null);

  /* Chat */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  /* Agent log accordion */
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  /* ── Polling ──────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      const [lRes, aRes, kRes, mRes] = await Promise.all([
        fetch('/api/nexios-ai/lifecycle'),
        fetch('/api/nexios-ai/agents'),
        fetch('/api/nexios-ai/knowledge?type=stats'),
        fetch('/api/nexios-ai/monitor'),
      ]);
      if (lRes.ok) setLifecycle(await lRes.json());
      if (aRes.ok) setOrchestrator(await aRes.json());
      if (kRes.ok) setKnowledge(await kRes.json());
      if (mRes.ok) setMonitor(await mRes.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 4000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  /* ── Actions ──────────────────────────────────────────────────────── */
  async function sendAction(action: string) {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/nexios-ai/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) setActionError(data.error ?? 'Action failed');
      await fetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setActionLoading(false);
    }
  }

  async function runTestCycle() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/nexios-ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      });
      const data = await res.json();
      setTestResult(data);
      setShowTest(true);
      await fetchAll();
    } catch (e) {
      setTestResult({ success: false, summary: 'Network error', results: {}, errors: [e instanceof Error ? e.message : 'Unknown error'] });
      setShowTest(true);
    } finally {
      setTestLoading(false);
    }
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setMessages(m => [...m, { role: 'user', text, ts: Date.now() }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/nexios-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(m => [...m, {
          role: 'ai',
          text: data.content,
          ts: Date.now(),
          category: data.category,
          confidence: data.confidence,
        }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: `⚠ ${data.error ?? 'Error'}`, ts: Date.now() }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠ Network error', ts: Date.now() }]);
    } finally {
      setChatLoading(false);
    }
  }

  /* ── Derived state ────────────────────────────────────────────────── */
  const state: AIState = lifecycle?.state ?? 'idle';
  const stateColor = STATE_COLORS[state];
  const isRunning = state === 'running' || state === 'paused';
  const learningOn = lifecycle?.learningEnabled ?? true;

  const uptimeMs = lifecycle?.startedAt ? Date.now() - lifecycle.startedAt : 0;
  const uptimeStr = uptimeMs > 0
    ? `${Math.floor(uptimeMs / 60000)}m ${Math.floor((uptimeMs % 60000) / 1000)}s`
    : '--';

  const agents = orchestrator?.agents ?? {};
  const agentNames = ['seeker', 'coding', 'self-improving'];

  const totalEntries = knowledge?.total ?? 0;
  const byCategory   = knowledge?.byCategory ?? {};

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: `0 0 24px ${stateColor}66` }}>
            <HiSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Nexios<span style={{ color: 'var(--accent)' }}>AI</span> — Autonomous System
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Self-improving AI with continuous learning</p>
          </div>
        </div>

        {/* State badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: `${stateColor}18`, border: `1px solid ${stateColor}44` }}>
          <BsCircleFill className={`w-2 h-2 ${state === 'starting' || state === 'running' ? 'animate-pulse' : ''}`} style={{ color: stateColor }} />
          <span className="text-sm font-semibold" style={{ color: stateColor }}>{STATE_LABELS[state]}</span>
        </div>
      </div>

      {/* ── Lifecycle Controls ──────────────────────────────────────── */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>AI Lifecycle Controls</p>

        <div className="flex flex-wrap gap-3">
          {/* Start / Stop */}
          {!isRunning ? (
            <button
              onClick={() => sendAction('start')}
              disabled={actionLoading || state === 'starting'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                opacity: actionLoading || state === 'starting' ? 0.6 : 1,
                boxShadow: '0 0 16px rgba(99,102,241,0.4)',
              }}
            >
              <BsPlay className="w-4 h-4" />
              {state === 'starting' ? 'Starting…' : 'Start AI'}
            </button>
          ) : (
            <button
              onClick={() => sendAction('stop')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
            >
              <BsStop className="w-4 h-4" />
              Stop AI
            </button>
          )}

          {/* Learning Toggle */}
          {isRunning && (
            <button
              onClick={() => sendAction('toggleLearning')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: learningOn ? '#10b98122' : '#f59e0b22',
                color: learningOn ? '#10b981' : '#f59e0b',
                border: `1px solid ${learningOn ? '#10b98144' : '#f59e0b44'}`,
              }}
            >
              {learningOn ? <BsPause className="w-4 h-4" /> : <BsLightning className="w-4 h-4" />}
              {learningOn ? 'Pause Learning' : 'Resume Learning'}
            </button>
          )}

          {/* Test Cycle */}
          <button
            onClick={runTestCycle}
            disabled={testLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ml-auto"
            style={{
              background: '#0ea5e922',
              color: '#0ea5e9',
              border: '1px solid #0ea5e944',
              opacity: testLoading ? 0.6 : 1,
            }}
          >
            <BsArrowRepeat className={`w-4 h-4 ${testLoading ? 'animate-spin' : ''}`} />
            {testLoading ? 'Testing…' : 'Run Test Cycle'}
          </button>
        </div>

        {/* State description */}
        <div className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {state === 'idle' && '● AI is Idle. Press Start to activate all agents and the response engine.'}
          {state === 'starting' && '● Initialising knowledge base and warming up the reasoning engine…'}
          {state === 'running' && '● AI is fully Running. Agents are continuously learning. You can send prompts below.'}
          {state === 'paused' && '● Learning is Paused. AI still responds intelligently using existing knowledge. Resume to re-enable agents.'}
        </div>

        {actionError && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#ef444418', color: '#ef4444', border: '1px solid #ef444430' }}>
            {actionError}
          </p>
        )}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Knowledge Entries" value={totalEntries.toLocaleString()} sub="Across all categories" />
        <StatCard label="Uptime" value={uptimeStr} sub={isRunning ? 'AI running' : 'Not started'} />
        <StatCard label="Agent Cycles" value={orchestrator?.cycleCount ?? 0} sub="Learning iterations" />
        <StatCard label="Items Processed" value={orchestrator?.totalItemsProcessed ?? 0} sub="Total knowledge acquired" />
      </div>

      {/* ── Main grid: Agents + Knowledge + Chat ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Agents Panel ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <BsGearFill className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Autonomous Agents</p>
            {orchestrator?.running && <BsArrowRepeat className="w-3 h-3 animate-spin ml-auto" style={{ color: '#10b981' }} />}
          </div>

          {agentNames.map(name => {
            const agent = agents[name] as AgentStatus | undefined;
            const expanded = expandedAgent === name;

            return (
              <div key={name} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                <button
                  onClick={() => setExpandedAgent(expanded ? null : name)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    {AGENT_ICONS[name]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{AGENT_LABELS[name]}</p>
                    {agent && <AgentStateIndicator state={agent.state} />}
                  </div>
                  {expanded ? <BsChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} /> : <BsChevronRight className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                    <p className="text-[11px] pt-2" style={{ color: 'var(--text-muted)' }}>{AGENT_DESCS[name]}</p>

                    {agent && (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-card)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Cycles</p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{agent.cyclesCompleted}</p>
                          </div>
                          <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-card)' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Items</p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{agent.itemsProcessed}</p>
                          </div>
                        </div>

                        {agent.currentTask && (
                          <p className="text-[11px] truncate px-2 py-1 rounded-lg animate-pulse" style={{ background: '#6366f118', color: 'var(--accent)' }}>
                            ⟳ {agent.currentTask}
                          </p>
                        )}

                        {agent.log.length > 0 && (
                          <div className="rounded-lg p-2 max-h-28 overflow-y-auto space-y-0.5" style={{ background: 'var(--bg-card)', scrollbarWidth: 'none' }}>
                            {agent.log.slice(0, 12).map((l, i) => (
                              <p key={i} className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{l}</p>
                            ))}
                          </div>
                        )}

                        {agent.errors > 0 && (
                          <p className="text-[11px] px-2 py-1 rounded-lg" style={{ background: '#ef444418', color: '#ef4444' }}>
                            {agent.errors} errors encountered
                          </p>
                        )}
                      </>
                    )}

                    {!agent && (
                      <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>Agent not yet initialised — start the AI to activate</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Knowledge Base + Chat ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Knowledge Base Stats */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2">
              <BsDatabase className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Knowledge Base</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
                {knowledge?.availableDatasets ?? 0} datasets
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(byCategory).map(([cat, count]) => (
                <div key={cat} className="rounded-lg px-3 py-2 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
                  <p className="text-[10px] capitalize truncate" style={{ color: 'var(--text-muted)' }}>{cat.replace('_', ' ')}</p>
                </div>
              ))}
              {Object.keys(byCategory).length === 0 && (
                <p className="col-span-full text-xs italic text-center py-2" style={{ color: 'var(--text-muted)' }}>
                  No knowledge entries yet. Start the AI to begin learning.
                </p>
              )}
            </div>

            {/* Dataset list preview */}
            {knowledge && knowledge.datasetNames.length > 0 && (
              <div className="text-[11px] rounded-lg px-3 py-2 leading-5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Active dataset sources: </span>
                {knowledge.datasetNames.slice(0, 8).join(' • ')}
                {knowledge.datasetNames.length > 8 && ` …+${knowledge.datasetNames.length - 8} more`}
              </div>
            )}
          </div>

          {/* Chat Interface */}
          <div className="rounded-2xl flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', height: '420px' }}>
            <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <BsChatDotsFill className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Chat with Nexios AI</p>
              {!isRunning && (
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                  Start AI to chat
                </span>
              )}
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <HiSparkles className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    Start the AI and ask me anything about coding, design, documents, or general knowledge.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Write a React hook for debounce', 'Explain machine learning', 'Design a landing page layout'].map(s => (
                      <button key={s} onClick={() => { setChatInput(s); }} className="text-[11px] px-3 py-1.5 rounded-full transition-all"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'user'
                      ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderBottomLeftRadius: '4px' }}
                  >
                    {msg.text}
                    {msg.role === 'ai' && msg.category && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                          {msg.category}
                        </span>
                        {msg.confidence !== undefined && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {(msg.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder={isRunning ? 'Ask Nexios AI anything…' : 'Start the AI to begin chatting…'}
                  disabled={!isRunning || chatLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    opacity: !isRunning ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!isRunning || !chatInput.trim() || chatLoading}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    opacity: (!isRunning || !chatInput.trim() || chatLoading) ? 0.4 : 1,
                  }}
                >
                  <BsBroadcast className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Storage Warning ─────────────────────────────────────────── */}
      {monitor?.storage?.nearLimit && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#f59e0b18', border: '1px solid #f59e0b44' }}>
          <BsDatabase className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
          <p className="text-sm" style={{ color: '#f59e0b' }}>
            Knowledge base at <strong>{monitor.storage.usagePercent}%</strong> capacity ({monitor.storage.entries.toLocaleString()}/{monitor.storage.maxEntries.toLocaleString()} entries). Self-Improving Agent will deduplicate automatically.
          </p>
        </div>
      )}

      {/* ── Test Results Panel ──────────────────────────────────────── */}
      {showTest && testResult && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-card)', border: `1px solid ${testResult.success ? '#10b98144' : '#ef444444'}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BsCircleFill className="w-2 h-2" style={{ color: testResult.success ? '#10b981' : '#ef4444' }} />
              <p className="text-sm font-semibold" style={{ color: testResult.success ? '#10b981' : '#ef4444' }}>
                {testResult.success ? 'All Systems Operational' : 'Test Issues Detected'}
              </p>
            </div>
            <button onClick={() => setShowTest(false)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
              Dismiss
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{testResult.summary}</p>

          {/* Test result grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(testResult.results).map(([key, val]) => {
              const r = val as Record<string, unknown>;
              const ok = r?.ok !== false && r?.skipped !== true;
              return (
                <div key={key} className="rounded-lg p-2 text-[11px]" style={{ background: ok ? '#10b98110' : '#ef444410', border: `1px solid ${ok ? '#10b98130' : '#ef444430'}` }}>
                  <p className="font-semibold capitalize" style={{ color: ok ? '#10b981' : '#ef4444' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  {typeof r?.entries === 'number' && <p style={{ color: 'var(--text-muted)' }}>Entries: {String(r.entries)}</p>}
                  {typeof r?.itemsEncoded === 'number' && <p style={{ color: 'var(--text-muted)' }}>Encoded: {String(r.itemsEncoded)}</p>}
                  {typeof r?.resultsFound === 'number' && <p style={{ color: 'var(--text-muted)' }}>Found: {String(r.resultsFound)}</p>}
                </div>
              );
            })}
          </div>

          {testResult.errors.length > 0 && (
            <div className="rounded-lg p-3 space-y-1" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
              <p className="text-[11px] font-semibold" style={{ color: '#ef4444' }}>Errors ({testResult.errors.length})</p>
              {testResult.errors.map((e, i) => (
                <p key={i} className="text-[11px] font-mono" style={{ color: '#ef4444' }}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Health & Recent Error Log ────────────────────────────────── */}
      {monitor && monitor.recentErrors.length > 0 && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2">
            <BsCircleFill className="w-2 h-2" style={{ color: monitor.health.ok ? '#10b981' : '#f59e0b' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>System Log</p>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {monitor.checkpoints.count} checkpoints
            </span>
          </div>
          <div className="rounded-lg p-3 max-h-32 overflow-y-auto space-y-0.5" style={{ background: 'var(--bg-secondary)', scrollbarWidth: 'none' }}>
            {monitor.recentErrors.slice(0, 10).map((line, i) => (
              <p key={i} className="text-[10px] font-mono" style={{ color: line.includes('ERROR') ? '#ef4444' : line.includes('WARN') ? '#f59e0b' : 'var(--text-muted)' }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Learning Pipeline Visualisation ────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Continuous Learning Loop</p>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
          {(['Seeker\nAgent', 'Coding\nAgent', 'Self-Improving\nAgent', 'Knowledge\nBase', 'Response\nEngine'] as const).map((label, i, arr) => (
            <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full text-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: (isRunning && learningOn) ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    color: (isRunning && learningOn) ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${(isRunning && learningOn) ? 'rgba(99,102,241,0.3)' : 'var(--glass-border)'}`,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className="text-lg shrink-0" style={{ color: (isRunning && learningOn) ? 'var(--accent)' : 'var(--text-muted)' }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {isRunning && learningOn
            ? `● Learning loop active — agents cycle automatically (Seeker every 3m · Coding every 2m · Self-Improving every 8m)`
            : state === 'paused'
            ? '● Learning paused — pipeline is idle. AI responds using existing knowledge.'
            : '● Pipeline inactive — start the AI to begin autonomous learning.'}
        </p>
      </div>

    </div>
  );
}
