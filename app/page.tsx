'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { HiArrowRight, HiCode, HiLightningBolt } from 'react-icons/hi';
import { BsRobot, BsCpu, BsStars, BsTerminal, BsGithub, BsBrush, BsFileEarmarkRichtext, BsPlayCircle, BsDownload, BsCodeSlash, BsCheck2Circle } from 'react-icons/bs';

const NAV_LINKS = ['Features', 'Pricing', 'Docs', 'Blog'];

const STATS = [
  { value: '10K+', label: 'Developers' },
  { value: '500M+', label: 'API calls/mo' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<30ms', label: 'Latency' },
];

const INTEGRATIONS = ['GitHub', 'Vercel', 'Supabase', 'OpenAI', 'AWS', 'Docker'];

const WORKSPACE_MODES = [
  {
    icon: HiCode,
    color: '#818cf8',
    glow: 'rgba(129,140,248,0.15)',
    label: 'Code',
    tag: 'IDE',
    headline: 'Full AI-powered code IDE',
    desc: 'A complete development environment with file explorer, Monaco editor, integrated terminal, and an AI agent that writes and edits files directly. Tell the AI what to build and watch it happen.',
    bullets: ['AI writes complete files — no copy-paste', 'Monaco editor with 40+ language support', 'Integrated terminal for running commands', 'Real-time AI activity log as it codes', 'Export your full project instantly'],
    preview: [
      { name: 'src/', folder: true },
      { name: '  index.ts', active: true },
      { name: '  agent.ts' },
      { name: '  api/' },
      { name: 'package.json' },
    ],
  },
  {
    icon: BsBrush,
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.15)',
    label: 'Design',
    tag: 'Vector',
    headline: 'Professional vector design canvas',
    desc: 'A full-featured vector design environment with an infinite canvas, layer management, color palette, object alignment tools — and an AI design assistant to guide your visual decisions.',
    bullets: ['Infinite vector canvas with all drawing tools', 'Layer management with visibility and locking', 'Full color palette with custom swatches', 'AI design assistant for layout and color advice', 'Export to PNG or SVG instantly'],
    preview: null,
  },
  {
    icon: BsFileEarmarkRichtext,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.12)',
    label: 'Document',
    tag: 'Editor',
    headline: 'Word-class document editor',
    desc: 'A professional word processor with a full formatting ribbon, white-page canvas, font controls, and an AI writing assistant that can draft and insert content directly into your document.',
    bullets: ['Full formatting ribbon — fonts, colors, alignment', 'White-page canvas with zoom and ruler', 'AI drafts content and inserts it in one click', 'Export to HTML, TXT, or print to PDF', 'Auto-save with live word and character count'],
    preview: null,
  },
];

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const goRegister = () => { setLoading(true); router.push('/register'); };

  const mode = WORKSPACE_MODES[activeMode];
  const ModeIcon = mode.icon;

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Animated gradient background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute animate-orb"
          style={{
            top: '-15%', left: '-8%',
            width: '650px', height: '650px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
            filter: 'blur(70px)',
            opacity: 0.18,
          }}
        />
        <div
          className="absolute animate-orb"
          style={{
            bottom: '-15%', right: '-8%',
            width: '550px', height: '550px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)',
            filter: 'blur(65px)',
            opacity: 0.13,
            animationDelay: '3s',
          }}
        />
        <div
          className="absolute animate-orb"
          style={{
            top: '40%', left: '55%',
            width: '400px', height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.07,
            animationDelay: '6s',
          }}
        />
      </div>
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-35" />

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 md:px-12 transition-all duration-300"
        style={{
          background: navScrolled ? 'rgba(8,12,20,0.95)' : 'rgba(8,12,20,0.75)',
          backdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${navScrolled ? 'rgba(255,255,255,0.1)' : 'var(--glass-border)'}`,
          boxShadow: navScrolled ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="flex items-center gap-2 mr-10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: 'var(--accent)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}>
            <BsRobot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Nexios<span style={{ color: 'var(--accent)' }}>AI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-7 mr-auto">
          {NAV_LINKS.map(l => (
            <Link key={l} href="#" className="text-sm transition-all duration-150 hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>{l}</Link>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/login" className="text-sm font-medium transition-all duration-150 hover:text-white" style={{ color: 'rgba(255,255,255,0.55)' }}>Sign in</Link>
          <button
            onClick={goRegister}
            className="btn-primary text-sm px-4 py-2 gap-1.5 transition-all duration-200 hover:scale-105"
          >
            Get started <HiArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8"
              style={{
                background: 'rgba(129,140,248,0.12)',
                border: '1px solid rgba(129,140,248,0.25)',
                color: 'var(--accent)',
                animation: 'fadeIn 0.5s ease forwards',
              }}
            >
              <BsStars className="w-3.5 h-3.5" />
              Next-gen AI development platform
            </div>

            <h1
              className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
              style={{ animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}
            >
              <span className="text-white">Build smarter with</span>
              <br />
              <span className="text-gradient">AI that codes</span>
            </h1>

            <p
              className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
              style={{
                color: 'rgba(255,255,255,0.55)',
                animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s both',
              }}
            >
              One workspace for code, design, Figma imports, and documents — with an AI agent that writes files directly, not just suggestions.
            </p>

            <div
              className="flex items-center justify-center gap-4 flex-wrap"
              style={{ animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s both' }}
            >
              <button
                onClick={goRegister}
                className="btn-primary px-7 py-3.5 text-base gap-2 transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Start Building Free <HiArrowRight className="w-4 h-4" /></>
                }
              </button>
              <Link href="/login" className="btn-ghost px-7 py-3.5 text-base transition-all duration-200 hover:scale-105 hover:-translate-y-0.5">
                <BsTerminal className="w-4 h-4" /> Sign In
              </Link>
            </div>

            <div
              className="flex items-center justify-center gap-10 mt-14 flex-wrap"
              style={{ animation: 'fadeIn 0.7s ease 0.5s both' }}
            >
              {STATS.map((s, i) => (
                <div key={i} className="text-center group cursor-default">
                  <p className="text-2xl font-bold text-white transition-all duration-200 group-hover:scale-110 group-hover:text-indigo-300">{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div
            className="relative max-w-5xl mx-auto"
            style={{ animation: 'scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}
          >
            <div
              className="glass rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-indigo-500/20"
              style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 32px 64px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70 transition-all hover:bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70 transition-all hover:bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70 transition-all hover:bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="mx-auto max-w-xs h-5 rounded-md text-xs flex items-center justify-center" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
                    nexios.ai/workspace/my-project
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 divide-x" style={{ borderColor: 'var(--glass-border)', minHeight: 320 }}>
                <div className="col-span-1 p-3 space-y-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {['src/', '  index.ts', '  agent.ts', '  api/', '    routes.ts', 'README.md'].map((f, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded cursor-pointer font-code transition-all duration-150 hover:bg-white/5"
                      style={{ color: i === 1 ? 'var(--accent)' : 'var(--text-muted)', background: i === 1 ? 'var(--accent-glow)' : 'transparent' }}>{f}</div>
                  ))}
                </div>
                <div className="col-span-3 p-4 font-code text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
                  <div><span style={{ color: '#818cf8' }}>import</span> <span style={{ color: '#34d399' }}>{'{ NexiosAgent }'}</span> <span style={{ color: '#818cf8' }}>from</span> <span style={{ color: '#fbbf24' }}>&apos;@nexios/core&apos;</span></div>
                  <div className="mt-2"><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>agent</span> = <span style={{ color: '#34d399' }}>new</span> <span style={{ color: '#f59e0b' }}>NexiosAgent</span>({'{'}</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>model</span>: <span style={{ color: '#fbbf24' }}>&apos;nexios-ai-v1&apos;</span>,</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>tools</span>: [<span style={{ color: '#fbbf24' }}>&apos;fs&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;terminal&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;github&apos;</span>]</div>
                  <div>{'}'});</div>
                  <div className="mt-3"><span style={{ color: '#94a3b8' }}>{'// AI writes files directly — no copy-paste'}</span></div>
                  <div><span style={{ color: '#818cf8' }}>await</span> agent.<span style={{ color: '#60a5fa' }}>run</span>(<span style={{ color: '#fbbf24' }}>&apos;Build a REST API with auth&apos;</span>);</div>
                  <div className="mt-1 flex items-center gap-1.5"><span className="animate-blink" style={{ color: 'var(--accent)' }}>▋</span></div>
                </div>
                <div className="col-span-1 p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nexios AI</p>
                  {['Creating files…', 'Writing tests', 'Running output', 'Done ✓'].map((s, i) => (
                    <div key={i} className="text-xs px-2 py-1.5 rounded transition-all duration-200" style={{
                      background: i === 3 ? 'rgba(52,211,153,0.1)' : 'var(--bg-card)',
                      color: i === 3 ? '#34d399' : 'var(--text-muted)',
                      border: `1px solid ${i === 3 ? 'rgba(52,211,153,0.2)' : 'var(--glass-border)'}`,
                    }}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workspace Modes ── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>What you can build</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Four powerful workspace modes</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Switch between modes inside a single project — or create dedicated workspaces for each</p>
          </AnimatedSection>

          {/* Mode selector tabs */}
          <AnimatedSection className="flex items-center gap-2 justify-center flex-wrap mb-10" delay={0.1}>
            {WORKSPACE_MODES.map((m, i) => {
              const Icon = m.icon;
              return (
                <button key={i} onClick={() => setActiveMode(i)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border hover:scale-105"
                  style={{
                    background: activeMode === i ? m.glow : 'transparent',
                    borderColor: activeMode === i ? m.color + '60' : 'var(--glass-border)',
                    color: activeMode === i ? m.color : 'rgba(255,255,255,0.5)',
                    boxShadow: activeMode === i ? `0 0 20px ${m.glow}` : 'none',
                  }}>
                  <Icon className="w-4 h-4" />
                  {m.label}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: activeMode === i ? m.color + '25' : 'var(--bg-card)', color: activeMode === i ? m.color : 'var(--text-muted)' }}>{m.tag}</span>
                </button>
              );
            })}
          </AnimatedSection>

          {/* Active mode detail */}
          <AnimatedSection delay={0.15}>
            <div className="glass rounded-3xl overflow-hidden transition-all duration-500" style={{ border: `1px solid ${mode.color}30`, boxShadow: `0 0 60px ${mode.glow}` }}>
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ background: mode.glow, border: `1px solid ${mode.color}30` }}>
                      <ModeIcon className="w-6 h-6" style={{ color: mode.color }} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: mode.color }}>{mode.label} Mode</span>
                      <h3 className="text-xl font-bold text-white">{mode.headline}</h3>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{mode.desc}</p>
                  <ul className="space-y-2.5 mb-8">
                    {mode.bullets.map((b, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm transition-all duration-150 hover:translate-x-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        <BsCheck2Circle className="w-4 h-4 shrink-0" style={{ color: mode.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button onClick={goRegister} className="btn-primary self-start gap-2 transition-all duration-200 hover:scale-105 hover:-translate-y-0.5" style={{ background: mode.color }}>
                    Try {mode.label} Mode <HiArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative p-8 flex flex-col justify-center" style={{ background: 'rgba(0,0,0,0.2)', borderLeft: `1px solid ${mode.color}15` }}>
                  {activeMode === 0 && (
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden border transition-all duration-200 hover:border-indigo-500/40" style={{ borderColor: 'var(--glass-border)' }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-500/60"/><div className="w-2 h-2 rounded-full bg-yellow-500/60"/><div className="w-2 h-2 rounded-full bg-green-500/60"/></div>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>index.ts</span>
                        </div>
                        <div className="p-4 font-code text-xs leading-loose">
                          <div><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>server</span> = <span style={{ color: '#f59e0b' }}>express</span>()</div>
                          <div style={{ color: '#6b7280' }}>{'// AI wrote this for you'}</div>
                          <div><span style={{ color: '#60a5fa' }}>server</span>.<span style={{ color: '#34d399' }}>listen</span>(<span style={{ color: '#fbbf24' }}>3000</span>)</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {['index.ts', 'routes.ts', 'auth.ts'].map(f => (
                          <div key={f} className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all duration-150 hover:scale-105" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeMode === 1 && (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(244,114,182,0.2)', background: 'rgba(0,0,0,0.25)' }}>
                        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(244,114,182,0.1)', background: 'rgba(244,114,182,0.06)' }}>
                          <BsBrush className="w-3 h-3" style={{ color: '#f472b6' }} />
                          <span className="text-[10px] font-semibold" style={{ color: '#f472b6' }}>Design Canvas</span>
                        </div>
                        <div className="p-4 space-y-2">
                          {['Layer 1 — Background', 'Layer 2 — Hero Section', 'Layer 3 — Navigation', 'Layer 4 — Components'].map((l, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded transition-all duration-150 hover:bg-white/5" style={{ background: i === 1 ? 'rgba(244,114,182,0.1)' : 'transparent', color: i === 1 ? '#f472b6' : 'var(--text-muted)' }}>
                              <span>{i === 1 ? '●' : '○'}</span> {l}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {['#f472b6', '#818cf8', '#34d399', '#fbbf24', '#60a5fa'].map(c => (
                          <div key={c} className="w-7 h-7 rounded-md border border-white/10 transition-all duration-150 hover:scale-125" style={{ background: c }} />
                        ))}
                        <span className="text-xs self-center ml-1" style={{ color: 'var(--text-muted)' }}>AI-suggested palette</span>
                      </div>
                    </div>
                  )}
                  {activeMode === 2 && (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border bg-white" style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
                        <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                          {['B', 'I', 'U'].map(f => <span key={f} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 transition-all hover:bg-gray-200">{f}</span>)}
                          <span className="text-[9px] text-gray-400 ml-2">Georgia 16px</span>
                        </div>
                        <div className="p-4">
                          <div className="text-sm font-bold text-gray-900 mb-1">Introduction</div>
                          <div className="text-xs text-gray-600 leading-relaxed">This document outlines the key principles of our API design, including authentication, rate limiting, and response formats…</div>
                          <div className="mt-2 text-[10px] text-indigo-500 italic">← AI drafted this paragraph in 2 seconds</div>
                        </div>
                      </div>
                      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)', color: 'var(--text-muted)' }}>
                        Ask AI to write, then insert with one click
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="py-16 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: BsPlayCircle,    color: '#34d399', title: 'Run & Preview',       desc: 'Run HTML files, projects, and scripts. Output opens in a new window instantly — no configuration.',              tag: 'Live' },
              { icon: BsGithub,        color: '#818cf8', title: 'GitHub Import',        desc: 'Import any public repo in one click. AI reads your code and starts contributing immediately.',                    tag: 'Import' },
              { icon: BsCpu,           color: '#f59e0b', title: 'Direct File Writing',  desc: 'The AI doesn\'t suggest code — it creates and edits files directly in your workspace.',                          tag: 'Unique' },
              { icon: BsDownload,      color: '#f472b6', title: 'ZIP Export',           desc: 'Download your entire project as a ZIP file with proper folder structure, ready to deploy.',                      tag: 'Export' },
              { icon: BsCodeSlash,     color: '#60a5fa', title: 'Multi-language',       desc: 'TypeScript, Python, Rust, Go, HTML, CSS, SQL — full syntax support with Monaco editor.',                        tag: '40+ langs' },
              { icon: HiLightningBolt, color: '#a78bfa', title: 'Autonomous Mode',      desc: 'Enable autonomous mode and the AI can reason about its own logic to overcome limitations.',                      tag: 'Advanced' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <AnimatedSection key={i} delay={i * 0.07}>
                  <div
                    className="glass glass-hover rounded-2xl p-5 group card-glow transition-all duration-200 cursor-default h-full"
                    style={{ border: '1px solid var(--glass-border)' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                        style={{ background: f.color + '18', border: `1px solid ${f.color}25` }}>
                        <Icon className="w-5 h-5" style={{ color: f.color }} />
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: f.color + '18', color: f.color }}>{f.tag}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5 transition-all duration-150 group-hover:translate-x-0.5">{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Three Workspaces Showcase ── */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Three dedicated environments</p>
            <h2 className="text-3xl font-bold text-white mb-3">One platform, three powerful workspaces</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Each workspace is purpose-built — no bloat, no crossover. Just the right tools for the job.</p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-5">

            {[
              {
                color: '#818cf8',
                gradFrom: '#6366f1',
                label: 'Code IDE',
                name: 'AI-Powered Code Editor',
                Icon: HiCode,
                tag: 'Code IDE',
                bullets: ['Monaco editor, file tree, terminal', 'AI agent writes files directly', 'Run & preview instantly'],
                preview: (
                  <div className="rounded-lg overflow-hidden mb-3" style={{ background: '#080c14', border: '1px solid rgba(129,140,248,0.15)' }}>
                    <div className="flex gap-1 px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-[9px] font-mono" style={{ color: '#818cf8' }}>index.ts</span>
                    </div>
                    <div className="p-3 font-mono text-[10px] space-y-0.5">
                      <div><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>app</span> = <span style={{ color: '#f59e0b' }}>express</span>()</div>
                      <div style={{ color: '#6b7280' }}>{'// AI wrote this for you'}</div>
                      <div><span style={{ color: '#60a5fa' }}>app</span>.<span style={{ color: '#34d399' }}>listen</span>(<span style={{ color: '#fbbf24' }}>3000</span>)</div>
                      <div className="flex items-center gap-1 mt-1"><span className="animate-blink" style={{ color: '#818cf8' }}>▋</span></div>
                    </div>
                  </div>
                ),
              },
              {
                color: '#f472b6',
                gradFrom: '#ec4899',
                label: 'Design',
                name: 'Vector Design Canvas',
                Icon: BsBrush,
                tag: 'Design',
                bullets: ['Infinite vector canvas + full toolset', 'Layers, palette, object properties', 'AI design assistant built in'],
                preview: (
                  <div className="rounded-lg overflow-hidden mb-3" style={{ background: '#080c14', border: '1px solid rgba(244,114,182,0.15)' }}>
                    <div className="flex gap-3 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['↖', '▭', '◯', 'T', '✏'].map((t, i) => <span key={i} className="text-[11px] transition-all hover:scale-125" style={{ color: i === 0 ? '#f472b6' : 'rgba(255,255,255,0.3)' }}>{t}</span>)}
                    </div>
                    <div className="p-3">
                      <div className="flex gap-1 mb-2">
                        {['Layer 1', 'Layer 2', 'Layer 3'].map((l, i) => (
                          <div key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: i === 0 ? 'rgba(244,114,182,0.15)' : 'rgba(255,255,255,0.04)', color: i === 0 ? '#f472b6' : 'rgba(255,255,255,0.3)' }}>{l}</div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {['#f472b6', '#818cf8', '#34d399', '#fbbf24', '#60a5fa', '#fff'].map(c => (
                          <div key={c} className="w-4 h-4 rounded-sm transition-all hover:scale-125" style={{ background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                color: '#34d399',
                gradFrom: '#10b981',
                label: 'Document',
                name: 'AI Word Processor',
                Icon: BsFileEarmarkRichtext,
                tag: 'Document',
                bullets: ['Full ribbon toolbar with all formatting', 'White-page canvas with ruler', 'AI writes and inserts content'],
                preview: (
                  <div className="rounded-lg overflow-hidden mb-3" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="flex gap-1 px-2 py-1.5 bg-white border-b border-gray-200">
                      {['B', 'I', 'U', 'Align', 'Color'].map((t, i) => (
                        <span key={i} className="text-[9px] px-1 py-0.5 rounded" style={{ background: i < 3 ? '#f1f5f9' : 'transparent', color: '#374151', fontWeight: i < 3 ? 700 : 400 }}>{t}</span>
                      ))}
                    </div>
                    <div className="p-3 bg-white">
                      <div className="text-[11px] font-bold text-gray-900 mb-1">Project Proposal</div>
                      <div className="text-[10px] text-gray-600 leading-relaxed">This proposal outlines the scope, timeline, and budget for the new platform redesign initiative…</div>
                      <div className="mt-1.5 text-[9px] px-2 py-0.5 rounded inline-block" style={{ background: 'rgba(52,211,153,0.1)', color: '#059669' }}>✓ AI inserted this</div>
                    </div>
                  </div>
                ),
              },
            ].map(({ color, gradFrom, label, name, Icon, bullets, preview }, idx) => (
              <AnimatedSection key={label} delay={idx * 0.1}>
                <div className="glass rounded-2xl overflow-hidden group card-glow transition-all duration-300 h-full"
                  style={{ border: `1px solid ${color}25` }}>
                  <div className="h-1.5 transition-all duration-300 group-hover:h-2" style={{ background: `linear-gradient(90deg, ${gradFrom}, ${color})` }} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                        style={{ background: `${color}18` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
                        <p className="text-sm font-bold text-white">{name}</p>
                      </div>
                    </div>
                    {preview}
                    <ul className="space-y-1">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs transition-all duration-150 hover:translate-x-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <BsCheck2Circle className="w-3 h-3 shrink-0" style={{ color }} />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="glass rounded-2xl p-7 relative overflow-hidden group card-glow transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full transition-all duration-500 group-hover:w-64 group-hover:h-64 group-hover:opacity-20"
                style={{ background: '#34d399', filter: 'blur(32px)', opacity: 0.08 }} />
              <BsGithub className="w-8 h-8 mb-4 text-white transition-all duration-200 group-hover:scale-110" />
              <h3 className="text-xl font-bold text-white mb-2">Connect everything you use</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Import any GitHub repository in one click. The AI reads your codebase, understands the structure, and contributes immediately. Deploy to Vercel, connect to Supabase — all from within Nexios.
              </p>
              <div className="flex gap-2 flex-wrap">
                {INTEGRATIONS.map((item, i) => (
                  <span
                    key={item}
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all duration-150 hover:scale-105 hover:border-white/20"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      color: 'rgba(255,255,255,0.55)',
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >{item}</span>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <BsStars className="w-8 h-8 mx-auto mb-6 animate-float" style={{ color: 'var(--accent)' }} />
          <h2 className="text-4xl font-bold text-white mb-4">Ready to build with AI?</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>Join 10,000+ developers already shipping with Nexios AI</p>
          <button
            onClick={goRegister}
            className="btn-primary px-9 py-4 text-base gap-2 transition-all duration-200 hover:scale-105 hover:-translate-y-1"
          >
            Start for Free <HiArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No credit card required · Cancel anytime</p>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110" style={{ background: 'var(--accent)' }}>
              <BsRobot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Nexios<span style={{ color: 'var(--accent)' }}>AI</span></span>
          </div>
          <div className="flex gap-6">
            {['Product', 'Company', 'Privacy', 'Terms'].map(l => (
              <Link key={l} href="#" className="text-xs transition-all duration-150 hover:text-white" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© 2025 Nexios AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
