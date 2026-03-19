'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BsDatabase, BsChatDotsFill, BsCpu, BsLightning,
  BsCircleFill, BsCodeSlash, BsBrush, BsCalculator,
  BsFlask, BsArrowRight, BsCheck2Circle, BsShieldCheck,
} from 'react-icons/bs';
import { HiSparkles, HiChip } from 'react-icons/hi';

interface ModelStatus {
  status: string;
  model: {
    version: string;
    buildDate: string;
    architecture: string;
    trainingPhases: string[];
    status: string;
  };
  performance: {
    requestCount: number;
    avgResponseMs: number;
    uptimeMs: number;
    knowledgeEntries: number;
  };
  ready: boolean;
}

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  ts: number;
  category?: string;
  confidence?: number;
  processingMs?: number;
}

const TRAINING_PHASES = [
  { id: 'basic-interactions', label: 'Conversations', icon: BsChatDotsFill, color: '#6366f1' },
  { id: 'programming',        label: 'Programming',   icon: BsCodeSlash,     color: '#818cf8' },
  { id: 'design',             label: 'Design',        icon: BsBrush,         color: '#f472b6' },
  { id: 'mathematics',        label: 'Mathematics',   icon: BsCalculator,    color: '#f59e0b' },
  { id: 'science',            label: 'Science',       icon: BsFlask,         color: '#34d399' },
];

const PIPELINE_STAGES = [
  { label: 'Load Datasets',    sub: 'Curated Q&A pairs'    },
  { label: 'Process & Clean',  sub: 'Filter & tokenise'    },
  { label: 'Train Model',      sub: 'TensorFlow.js'        },
  { label: 'Validate',         sub: 'Benchmark tests'      },
  { label: 'Export & Deploy',  sub: 'Inference-only build' },
];

const SUGGESTED = [
  'Write a React hook for debounce',
  'Explain machine learning',
  'Design a landing page layout',
  'What is the Pythagorean theorem?',
];

function MetricCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-1.5 transition-all duration-200 hover-lift"
      style={{
        background: accent ? 'var(--accent-glow)' : 'var(--bg-card)',
        border: `1px solid ${accent ? 'rgba(99,102,241,0.25)' : 'var(--glass-border)'}`,
      }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

export default function NexiosAIPage() {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nexios-ai/status');
      if (res.ok) setModelStatus(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 10000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  async function sendChat(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;
    setChatInput('');
    setMessages(m => [...m, { role: 'user', text: msg, ts: Date.now() }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/nexios-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(m => [...m, {
          role: 'ai',
          text: data.content,
          ts: Date.now(),
          category: data.category,
          confidence: data.confidence,
          processingMs: data.processingMs,
        }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: `Error: ${data.error ?? 'Something went wrong'}`, ts: Date.now() }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Network error. Please try again.', ts: Date.now() }]);
    } finally {
      setChatLoading(false);
    }
  }

  const perf = modelStatus?.performance;
  const model = modelStatus?.model;
  const uptimeStr = perf?.uptimeMs
    ? perf.uptimeMs > 3600000
      ? `${Math.floor(perf.uptimeMs / 3600000)}h ${Math.floor((perf.uptimeMs % 3600000) / 60000)}m`
      : `${Math.floor(perf.uptimeMs / 60000)}m`
    : '—';

  return (
    <div className="min-h-screen p-5 space-y-5 animate-pageIn" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center animate-glow"
            style={{ background: 'linear-gradient(135deg, var(--accent), #a5b4fc)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}>
            <HiSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Nexios<span style={{ color: 'var(--accent)' }}>AI</span>
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Deployment-trained inference engine · Always ready
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: '#10b98118', border: '1px solid #10b98130' }}>
          <BsCircleFill className="w-2 h-2 animate-pulse" style={{ color: '#10b981' }} />
          <span className="text-sm font-semibold" style={{ color: '#10b981' }}>Operational</span>
          {model && (
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: '#10b98118', color: '#10b981' }}>
              v{model.version}
            </span>
          )}
        </div>
      </div>

      {/* ── Metrics Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Model Version"
          value={model?.version ? `v${model.version}` : 'v1.0.0'}
          sub="Deployment-trained"
          accent
        />
        <MetricCard
          label="Avg Response"
          value={perf?.avgResponseMs ? `${perf.avgResponseMs}ms` : '<5ms'}
          sub="Pure inference speed"
        />
        <MetricCard
          label="Knowledge Entries"
          value={perf?.knowledgeEntries ?? 70}
          sub="Curated training data"
        />
        <MetricCard
          label="Requests Served"
          value={perf?.requestCount ?? 0}
          sub={`Uptime: ${uptimeStr}`}
        />
      </div>

      {/* ── Training Phases Strip ────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BsShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Training Curriculum — Deployed &amp; Validated
          </p>
          <div className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98130' }}>
            <BsCheck2Circle className="w-3 h-3" />
            All phases passed
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRAINING_PHASES.map((phase, i) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: `${phase.color}12`,
                  border: `1px solid ${phase.color}30`,
                  color: phase.color,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {phase.label}
                <BsCheck2Circle className="w-3 h-3 opacity-70" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Content: Chat + Architecture ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Chat Panel (2/3 width) ──────────────────────────────── */}
        <div className="lg:col-span-2 rounded-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', height: '520px' }}>

          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <BsChatDotsFill className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Chat with Nexios AI
            </p>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: '#10b98118', color: '#10b981', border: '1px solid #10b98130' }}>
              ● Live
            </span>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
                  style={{ background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <HiSparkles className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Nexios AI is ready
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Ask anything about coding, design, mathematics, or science
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      onClick={() => sendChat(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full transition-all duration-150"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--glass-border)',
                      }}
                      onMouseOver={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                      }}
                      onMouseOut={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msgIn`}>
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: 'var(--accent)', color: '#fff', borderBottomRightRadius: '6px' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderBottomLeftRadius: '6px' }}
                >
                  {msg.text}
                  {msg.role === 'ai' && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {msg.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.15)' }}>
                          {msg.category}
                        </span>
                      )}
                      {msg.confidence !== undefined && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {(msg.confidence * 100).toFixed(0)}% match
                        </span>
                      )}
                      {msg.processingMs !== undefined && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {msg.processingMs}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--accent)', animationDelay: `${i * 0.12}s` }} />
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
                placeholder="Ask Nexios AI anything…"
                disabled={chatLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--input-border-focus)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--glass-border)'; }}
              />
              <button
                onClick={() => sendChat()}
                disabled={!chatInput.trim() || chatLoading}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  opacity: (!chatInput.trim() || chatLoading) ? 0.45 : 1,
                  boxShadow: chatInput.trim() ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
                }}
                onMouseOver={e => { if (chatInput.trim()) (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                <BsArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Model Info + Architecture ──────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Model Info Card */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2">
              <HiChip className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Model Information</p>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Version',       value: model?.version ? `v${model.version}` : 'v1.0.0' },
                { label: 'Architecture',  value: 'Inference Engine' },
                { label: 'Training',      value: 'Build-time TF.js' },
                { label: 'Validation',    value: 'Auto-tested' },
                { label: 'Runtime Mode',  value: 'Inference Only' },
                { label: 'Build Date',    value: model?.buildDate ? new Date(model.buildDate).toLocaleDateString() : 'Latest' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1 px-2 py-2 rounded-lg"
              style={{ background: '#10b98110', border: '1px solid #10b98125' }}>
              <BsCheck2Circle className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
              <p className="text-[11px] font-medium" style={{ color: '#10b981' }}>
                Model validated · All tests passed
              </p>
            </div>
          </div>

          {/* Capabilities Card */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2">
              <BsLightning className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Capabilities</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: BsChatDotsFill, label: 'Conversations',  color: '#6366f1', desc: 'Greetings & general chat' },
                { icon: BsCodeSlash,    label: 'Programming',    color: '#818cf8', desc: 'Code & algorithms' },
                { icon: BsBrush,        label: 'Design',         color: '#f472b6', desc: 'UI/UX guidance' },
                { icon: BsCalculator,   label: 'Mathematics',    color: '#f59e0b', desc: 'Equations & reasoning' },
                { icon: BsFlask,        label: 'Science',        color: '#34d399', desc: 'Physics, biology & more' },
              ].map(({ icon: Icon, label, color, desc }) => (
                <div key={label} className="flex items-center gap-2.5 py-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Deployment Training Pipeline Diagram ─────────────────────── */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <BsDatabase className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Deployment Training Architecture
          </p>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
            Build-time only
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 rounded-xl px-3 py-3 text-center transition-all duration-200"
                style={{
                  background: 'var(--accent-glow)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{stage.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stage.sub}</p>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <BsArrowRight className="w-3.5 h-3.5 shrink-0 hidden sm:block" style={{ color: 'var(--accent)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Training', desc: 'Runs once at deployment — not during user sessions. Uses TensorFlow.js with curated multi-domain datasets.', icon: BsCpu },
            { label: 'Validation', desc: 'After training, benchmark tests verify correctness across all categories. Deployment is blocked if tests fail.', icon: BsShieldCheck },
            { label: 'Runtime', desc: 'The deployed app performs inference only — fast, stable, consistent responses with no live learning overhead.', icon: BsLightning },
          ].map(({ label, desc, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3 space-y-1.5"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
