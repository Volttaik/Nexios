'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { HiArrowLeft, HiLightningBolt, HiDatabase, HiCog, HiRefresh, HiPlay, HiStop, HiCheckCircle, HiChartBar } from 'react-icons/hi';
import { BsRobot, BsCpuFill, BsCloudDownload, BsShieldCheck } from 'react-icons/bs';

interface StatusData {
  version: string;
  status: string;
  knowledge: { totalEntries: number; byCategory: Record<string, number> };
  checkpoints: number;
  datasetsCompleted: number;
  ultraMode: {
    active: boolean;
    cyclesCompleted: number;
    pagesCollected: number;
    entriesAdded: number;
    currentPhase?: string;
    lastCycleAt?: number;
    nextCycleAt?: number;
  };
  engine: { requestCount: number; uptimeMs: number };
}

interface TrainResult {
  success: boolean;
  message: string;
  totalKnowledgeEntries: number;
  entriesAdded: number;
  datasets: number;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {text}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function PhaseIndicator({ phase }: { phase?: string }) {
  if (!phase) return null;
  const phases = ['searching', 'crawling', 'validating', 'storing', 'checkpointing'];
  const idx = phases.indexOf(phase);
  return (
    <div className="flex items-center gap-2 mt-3">
      {phases.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${i <= idx ? 'animate-pulse' : ''}`}
            style={{ background: i < idx ? '#34d399' : i === idx ? '#818cf8' : 'rgba(255,255,255,0.15)' }} />
          <span className="text-[9px]" style={{ color: i === idx ? '#818cf8' : 'rgba(255,255,255,0.3)' }}>{p}</span>
          {i < phases.length - 1 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>→</span>}
        </div>
      ))}
    </div>
  );
}

export default function NexiosAIPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [ultraToggling, setUltraToggling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nexios-ai/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  async function runTraining() {
    setTraining(true);
    setTrainResult(null);
    try {
      const res = await fetch('/api/nexios-ai/train', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      setTrainResult(data);
      await fetchStatus();
    } catch (e: any) {
      setTrainResult({ success: false, message: e.message, totalKnowledgeEntries: 0, entriesAdded: 0, datasets: 0 });
    }
    setTraining(false);
  }

  async function toggleUltra() {
    if (!status) return;
    setUltraToggling(true);
    const action = status.ultraMode.active ? 'stop' : 'start';
    try {
      await fetch('/api/nexios-ai/ultra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchStatus();
    } catch { /* ignore */ }
    setUltraToggling(false);
  }

  const accentIndigo = '#818cf8';
  const accentGreen  = '#34d399';
  const accentPink   = '#f472b6';
  const accentAmber  = '#fbbf24';

  return (
    <div className="min-h-screen" style={{ background: '#080c14', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0c0f17' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <HiArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
          <div className="flex items-center gap-2">
            <BsRobot className="w-4 h-4" style={{ color: accentIndigo }} />
            <span className="font-semibold text-sm">Nexios AI Control Center</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge text={status?.status ?? 'loading'} color={accentGreen} />
            <Badge text={`v${status?.version ?? '...'}`} color={accentIndigo} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(129,140,248,0.2)' }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10" style={{ background: accentIndigo, filter: 'blur(48px)' }} />
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.3)' }}>
              <BsCpuFill className="w-7 h-7" style={{ color: accentIndigo }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">Nexios AI — Native Intelligence System</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                A fully local AI model built into the Nexios platform. No external API keys required.
                Nexios AI uses a modular knowledge retrieval and reasoning engine that grows smarter over time
                through built-in training datasets and Ultra Mode autonomous web learning.
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={HiDatabase} label="Knowledge Entries" value={status?.knowledge.totalEntries ?? 0} color={accentIndigo} />
            <StatCard icon={HiCheckCircle} label="Checkpoints Saved" value={status?.checkpoints ?? 0} color={accentGreen} />
            <StatCard icon={BsCloudDownload} label="Datasets Trained" value={status?.datasetsCompleted ?? 0} color={accentPink} />
            <StatCard icon={HiChartBar} label="Requests Handled" value={status?.engine.requestCount ?? 0} color={accentAmber} />
          </div>
        )}

        {/* Main grid */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Training Panel */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-1">
              <HiCog className="w-5 h-5" style={{ color: accentPink }} />
              <h2 className="font-bold text-white">Training Pipeline</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Load Nexios AI&apos;s built-in datasets covering JavaScript, TypeScript, React, Node.js,
              REST APIs, SQL, design theory, typography, colour, documentation writing, and general AI knowledge.
            </p>

            {/* Dataset list */}
            <div className="space-y-1.5">
              {['JavaScript Fundamentals', 'Design Principles', 'Document Writing', 'General Knowledge'].map((ds, i) => {
                const trained = (status?.datasetsCompleted ?? 0) > i;
                return (
                  <div key={ds} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: trained ? accentGreen : 'rgba(255,255,255,0.15)' }} />
                    <span style={{ color: trained ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{ds}</span>
                    {trained && <span className="ml-auto text-[9px] font-semibold" style={{ color: accentGreen }}>✓ TRAINED</span>}
                  </div>
                );
              })}
            </div>

            <button
              onClick={runTraining}
              disabled={training}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: training ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${accentPink}22, ${accentPink}11)`,
                border: `1px solid ${training ? 'rgba(255,255,255,0.07)' : accentPink + '44'}`,
                color: training ? 'rgba(255,255,255,0.3)' : accentPink,
                cursor: training ? 'not-allowed' : 'pointer',
              }}>
              {training ? (
                <><HiRefresh className="w-4 h-4 animate-spin" /> Training in progress…</>
              ) : (
                <><HiPlay className="w-4 h-4" /> Run Training Pipeline</>
              )}
            </button>

            {trainResult && (
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: trainResult.success ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${trainResult.success ? accentGreen : '#f87171'}33`, color: trainResult.success ? accentGreen : '#f87171' }}>
                {trainResult.message}
                {trainResult.success && <span className="ml-2 opacity-60">· {trainResult.totalKnowledgeEntries} total entries</span>}
              </div>
            )}
          </div>

          {/* Ultra Mode Panel */}
          <div className="rounded-2xl p-6 space-y-4 relative overflow-hidden" style={{ background: status?.ultraMode.active ? 'rgba(129,140,248,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${status?.ultraMode.active ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
            {status?.ultraMode.active && (
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${accentIndigo}, transparent)` }} />
            )}

            <div className="flex items-center gap-2 mb-1">
              <HiLightningBolt className="w-5 h-5" style={{ color: accentIndigo }} />
              <h2 className="font-bold text-white">Ultra Mode</h2>
              {status?.ultraMode.active && <Badge text="ACTIVE" color={accentIndigo} />}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ultra Mode is Nexios AI&apos;s autonomous self-improvement engine. When active, it periodically
              crawls technical documentation, Wikipedia articles, and educational resources — validates the content,
              extracts useful knowledge, and stores it to the knowledge base. Every cycle creates a checkpoint.
            </p>

            {status?.ultraMode.active && (
              <div className="rounded-lg px-4 py-3 text-xs space-y-2" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' }}>
                <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>Cycles completed</span><span className="font-bold text-white">{status.ultraMode.cyclesCompleted}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>Pages collected</span><span className="font-bold text-white">{status.ultraMode.pagesCollected}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>Entries added</span><span className="font-bold text-white">{status.ultraMode.entriesAdded}</span>
                </div>
                {status.ultraMode.lastCycleAt && (
                  <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <span>Last cycle</span>
                    <span className="font-bold text-white">{new Date(status.ultraMode.lastCycleAt).toLocaleTimeString()}</span>
                  </div>
                )}
                {status.ultraMode.currentPhase && (
                  <>
                    <div className="text-xs font-semibold mt-1" style={{ color: accentIndigo }}>Current phase: {status.ultraMode.currentPhase}</div>
                    <PhaseIndicator phase={status.ultraMode.currentPhase} />
                  </>
                )}
              </div>
            )}

            <button
              onClick={toggleUltra}
              disabled={ultraToggling}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: ultraToggling ? 'rgba(255,255,255,0.05)' : status?.ultraMode.active
                  ? 'rgba(248,113,113,0.1)' : `linear-gradient(135deg, ${accentIndigo}22, ${accentIndigo}11)`,
                border: `1px solid ${ultraToggling ? 'rgba(255,255,255,0.07)' : status?.ultraMode.active ? '#f8717144' : accentIndigo + '44'}`,
                color: ultraToggling ? 'rgba(255,255,255,0.3)' : status?.ultraMode.active ? '#f87171' : accentIndigo,
                cursor: ultraToggling ? 'not-allowed' : 'pointer',
              }}>
              {ultraToggling ? (
                <><HiRefresh className="w-4 h-4 animate-spin" /> Updating…</>
              ) : status?.ultraMode.active ? (
                <><HiStop className="w-4 h-4" /> Stop Ultra Mode</>
              ) : (
                <><HiLightningBolt className="w-4 h-4" /> Activate Ultra Mode</>
              )}
            </button>
          </div>
        </div>

        {/* Knowledge breakdown */}
        {status && status.knowledge.totalEntries > 0 && (
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <HiDatabase className="w-5 h-5" style={{ color: accentGreen }} />
              <h2 className="font-bold text-white">Knowledge Base Breakdown</h2>
              <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{status.knowledge.totalEntries} total entries</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(status.knowledge.byCategory).map(([cat, count]) => {
                const pct = Math.round((count / status.knowledge.totalEntries) * 100);
                const colors: Record<string, string> = { programming: accentIndigo, design: accentPink, documentation: accentGreen, general: accentAmber, web_content: '#60a5fa', science: '#a78bfa', mathematics: '#f97316', conversation: '#e879f9', dataset: '#94a3b8' };
                const color = colors[cat] ?? accentIndigo;
                return (
                  <div key={cat} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{cat}</span>
                      <span className="text-xs font-bold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[9px] mt-1 block" style={{ color: 'rgba(255,255,255,0.25)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <BsShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accentGreen }} />
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Security Controls Active</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Nexios AI operates under strict security rules. It can expand its knowledge base and improve reasoning datasets,
              but it cannot modify its own core architecture, API routes, or platform code automatically.
              All core system files are write-protected. Only developer action can change the core.
            </p>
          </div>
        </div>

        {/* Architecture overview */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-bold text-white mb-4">System Architecture</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Core AI Engine', desc: 'Input routing, intent classification, response orchestration', color: accentIndigo },
              { label: 'Knowledge Storage', desc: 'Persistent JSON knowledge graph with keyword scoring', color: accentGreen },
              { label: 'Reasoning Engine', desc: 'Category-aware response generation from retrieved knowledge', color: accentPink },
              { label: 'Working Memory', desc: 'Per-session conversation context window management', color: accentAmber },
              { label: 'Web Crawler', desc: 'Fetches and parses MDN, Wikipedia, React docs, and more', color: '#60a5fa' },
              { label: 'Content Validator', desc: 'Quality scoring, spam detection, vocabulary diversity', color: '#a78bfa' },
              { label: 'Training Pipeline', desc: 'Ingests built-in and crawled datasets into knowledge base', color: '#f97316' },
              { label: 'Checkpoint System', desc: 'Snapshots of knowledge growth at every learning stage', color: '#e879f9' },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-2 h-2 rounded-full mb-2" style={{ background: m.color }} />
                <p className="text-xs font-semibold text-white mb-1">{m.label}</p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
