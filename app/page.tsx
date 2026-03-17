'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiArrowRight, HiCode, HiGlobe, HiLightningBolt } from 'react-icons/hi';
import { BsRobot, BsCpu, BsStars, BsTerminal, BsGithub, BsBrush, BsFileEarmarkRichtext, BsPlayCircle, BsDownload, BsCodeSlash, BsCheck2Circle } from 'react-icons/bs';
import { SiFigma } from 'react-icons/si';

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
    headline: 'Full AI-powered IDE',
    desc: 'Write, debug, and ship code with an AI that understands your entire codebase. Monaco editor, file tree, terminal, and an agent that directly creates and edits files — no copy-paste needed.',
    bullets: ['AI writes files directly to your workspace', 'Monaco editor with 40+ language support', 'Built-in terminal with real commands', 'Import any GitHub repository instantly', 'Export your project as a ZIP'],
    preview: [
      { name: 'src/', folder: true },
      { name: '  index.ts', active: true },
      { name: '  agent.ts' },
      { name: '  api/' },
      { name: 'package.json' },
    ],
  },
  {
    icon: SiFigma,
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.15)',
    label: 'Figma Design',
    tag: 'Design',
    headline: 'Import Figma → working code',
    desc: 'Paste any Figma file URL and let the AI convert your designs into pixel-perfect React, HTML, or Vue components. Access thousands of Figma community templates instantly.',
    bullets: ['Import any public Figma file URL', 'AI converts designs to React/HTML/CSS', 'Access Figma community design systems', 'Material Design, iOS, and Tailwind kits', 'Component-level design inspection'],
    preview: null,
    figmaLinks: [
      { label: 'Material Design 3', url: 'https://www.figma.com/community/file/1035203688168086460' },
      { label: 'Apple iOS 17 UI', url: 'https://www.figma.com/community/file/1247950726448004999' },
      { label: 'Tailwind UI Kit', url: 'https://www.figma.com/community/file/768809027799962739' },
      { label: 'Shadcn/UI Kit', url: 'https://www.figma.com/community/file/1203061493325953101' },
    ],
  },
  {
    icon: BsBrush,
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.12)',
    label: 'Design',
    tag: 'UI Gen',
    headline: 'Describe UI, get components',
    desc: 'Tell the AI what you want to build and watch it generate beautiful, production-ready UI components. From landing pages to dashboards — describe it, get code.',
    bullets: ['AI generates complete UI from description', 'React, Vue, HTML/CSS output', 'Dark mode and responsive by default', 'Copy components directly to your project', 'Refine with natural language follow-ups'],
    preview: null,
  },
  {
    icon: BsFileEarmarkRichtext,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.12)',
    label: 'Document',
    tag: 'Docs',
    headline: 'AI-powered documentation',
    desc: 'Write technical docs, README files, API references, and proposals with an AI that knows your codebase. Markdown editor with AI drafting, editing, and expanding on demand.',
    bullets: ['Markdown editor with live preview', 'AI drafts from your code context', 'Generate README, API docs, changelogs', 'Export to PDF or Markdown', 'Collaborative editing with version history'],
    preview: null,
  },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(0);

  const goRegister = () => { setLoading(true); router.push('/register'); };

  const mode = WORKSPACE_MODES[activeMode];
  const ModeIcon = mode.icon;

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-5"
          style={{ background: 'radial-gradient(circle, #a5b4fc 0%, transparent 60%)', filter: 'blur(80px)' }} />
      </div>
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-40" />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 md:px-12"
        style={{ background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2 mr-10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <BsRobot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Nexios<span style={{ color: 'var(--accent)' }}>AI</span></span>
        </div>
        <div className="hidden md:flex items-center gap-7 mr-auto">
          {NAV_LINKS.map(l => (
            <Link key={l} href="#" className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>{l}</Link>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Sign in</Link>
          <button onClick={goRegister} className="btn-primary text-sm px-4 py-2 gap-1.5">
            Get started <HiArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8 animate-fadeIn"
              style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', color: 'var(--accent)' }}>
              <BsStars className="w-3.5 h-3.5" />
              Next-gen AI development platform
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 animate-slideUp">
              <span className="text-white">Build smarter with</span>
              <br />
              <span className="text-gradient">AI that codes</span>
            </h1>

            <p className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed animate-slideUp"
              style={{ color: 'var(--text-secondary)', animationDelay: '0.1s' }}>
              One workspace for code, design, Figma imports, and documents — with an AI agent that writes files directly, not just suggestions.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap animate-slideUp" style={{ animationDelay: '0.2s' }}>
              <button onClick={goRegister} className="btn-primary px-7 py-3.5 text-base gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Start Building Free <HiArrowRight className="w-4 h-4" /></>}
              </button>
              <Link href="/login" className="btn-ghost px-7 py-3.5 text-base">
                <BsTerminal className="w-4 h-4" /> Sign In
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
              {STATS.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative max-w-5xl mx-auto animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="glass rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 32px 64px rgba(0,0,0,0.5)' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
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
                    <div key={i} className="text-xs px-2 py-1 rounded cursor-pointer font-code"
                      style={{ color: i === 1 ? 'var(--accent)' : 'var(--text-muted)', background: i === 1 ? 'var(--accent-glow)' : 'transparent' }}>{f}</div>
                  ))}
                </div>
                <div className="col-span-3 p-4 font-code text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
                  <div><span style={{ color: '#818cf8' }}>import</span> <span style={{ color: '#34d399' }}>{'{ NexiosAgent }'}</span> <span style={{ color: '#818cf8' }}>from</span> <span style={{ color: '#fbbf24' }}>&apos;@nexios/core&apos;</span></div>
                  <div className="mt-2"><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>agent</span> = <span style={{ color: '#34d399' }}>new</span> <span style={{ color: '#f59e0b' }}>NexiosAgent</span>({'{'}</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>model</span>: <span style={{ color: '#fbbf24' }}>&apos;gemini-pro&apos;</span>,</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>tools</span>: [<span style={{ color: '#fbbf24' }}>&apos;fs&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;terminal&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;github&apos;</span>]</div>
                  <div>{'}'});</div>
                  <div className="mt-3"><span style={{ color: '#94a3b8' }}>{'// AI writes files directly — no copy-paste'}</span></div>
                  <div><span style={{ color: '#818cf8' }}>await</span> agent.<span style={{ color: '#60a5fa' }}>run</span>(<span style={{ color: '#fbbf24' }}>&apos;Build a REST API with auth&apos;</span>);</div>
                  <div className="mt-1 flex items-center gap-1.5"><span className="animate-blink" style={{ color: 'var(--accent)' }}>▋</span></div>
                </div>
                <div className="col-span-1 p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Nexios AI</p>
                  {['Creating files…', 'Writing tests', 'Running output', 'Done ✓'].map((s, i) => (
                    <div key={i} className="text-xs px-2 py-1.5 rounded" style={{
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
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>What you can build</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Four powerful workspace modes</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Switch between modes inside a single project — or create dedicated workspaces for each</p>
          </div>

          {/* Mode selector tabs */}
          <div className="flex items-center gap-2 justify-center flex-wrap mb-10">
            {WORKSPACE_MODES.map((m, i) => {
              const Icon = m.icon;
              return (
                <button key={i} onClick={() => setActiveMode(i)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                  style={{
                    background: activeMode === i ? m.glow : 'transparent',
                    borderColor: activeMode === i ? m.color + '60' : 'var(--glass-border)',
                    color: activeMode === i ? m.color : 'var(--text-secondary)',
                  }}>
                  <Icon className="w-4 h-4" />
                  {m.label}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: activeMode === i ? m.color + '25' : 'var(--bg-card)', color: activeMode === i ? m.color : 'var(--text-muted)' }}>{m.tag}</span>
                </button>
              );
            })}
          </div>

          {/* Active mode detail */}
          <div className="glass rounded-3xl overflow-hidden" style={{ border: `1px solid ${mode.color}30`, boxShadow: `0 0 60px ${mode.glow}` }}>
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: info */}
              <div className="p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: mode.glow, border: `1px solid ${mode.color}30` }}>
                    <ModeIcon className="w-6 h-6" style={{ color: mode.color }} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: mode.color }}>{mode.label} Mode</span>
                    <h3 className="text-xl font-bold text-white">{mode.headline}</h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{mode.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {mode.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <BsCheck2Circle className="w-4 h-4 shrink-0" style={{ color: mode.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <button onClick={goRegister} className="btn-primary self-start gap-2" style={{ background: mode.color }}>
                  Try {mode.label} Mode <HiArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Right: visual preview */}
              <div className="relative p-8 flex flex-col justify-center" style={{ background: 'rgba(0,0,0,0.2)', borderLeft: `1px solid ${mode.color}15` }}>
                {activeMode === 0 && (
                  <div className="space-y-2">
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--glass-border)' }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-500/60"/><div className="w-2 h-2 rounded-full bg-yellow-500/60"/><div className="w-2 h-2 rounded-full bg-green-500/60"/></div>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>index.ts</span>
                      </div>
                      <div className="p-4 font-code text-xs leading-loose">
                        <div><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>server</span> = <span style={{ color: '#f59e0b' }}>express</span>()</div>
                        <div><span style={{ color: '#94a3b8' }}>{'// AI wrote this for you'}</span></div>
                        <div><span style={{ color: '#60a5fa' }}>server</span>.<span style={{ color: '#34d399' }}>listen</span>(<span style={{ color: '#fbbf24' }}>3000</span>)</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {['index.ts', 'routes.ts', 'auth.ts'].map(f => (
                        <div key={f} className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{f}</div>
                      ))}
                    </div>
                  </div>
                )}

                {activeMode === 1 && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4 border" style={{ borderColor: 'rgba(244,114,182,0.2)', background: 'rgba(244,114,182,0.05)' }}>
                      <p className="text-xs font-semibold mb-3" style={{ color: '#f472b6' }}>Popular Figma Templates</p>
                      {(mode as any).figmaLinks?.map((link: any, i: number) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 py-2 text-xs transition-colors group"
                          style={{ color: 'var(--text-secondary)', borderBottom: i < 3 ? '1px solid rgba(244,114,182,0.1)' : 'none' }}>
                          <SiFigma className="w-3 h-3 text-pink-400 shrink-0" />
                          <span className="flex-1 group-hover:text-white transition-colors">{link.label}</span>
                          <HiArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-pink-400" />
                        </a>
                      ))}
                    </div>
                    <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
                      Paste any Figma URL → AI converts to React code
                    </div>
                  </div>
                )}

                {activeMode === 2 && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4" style={{ background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.15)' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>User said:</p>
                      <p className="text-sm text-white mb-3">&quot;Build me a dark pricing page with 3 tiers&quot;</p>
                      <div className="h-px mb-3" style={{ background: 'rgba(244,114,182,0.1)' }} />
                      <p className="text-xs mb-1" style={{ color: '#f472b6' }}>AI generated:</p>
                      <div className="flex gap-1.5">
                        {['PricingCard.tsx', 'pricing.css'].map(f => (
                          <div key={f} className="px-2 py-1 rounded text-[10px] font-mono" style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6' }}>{f}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeMode === 3 && (
                  <div className="space-y-2">
                    <div className="rounded-xl p-4" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      {['# API Reference', '## Authentication', 'All endpoints require...', '## Endpoints', '`GET /api/users`'].map((line, i) => (
                        <div key={i} className="text-xs py-0.5 font-mono" style={{ color: i === 0 ? '#fff' : i === 1 || i === 3 ? '#34d399' : 'var(--text-muted)' }}>{line}</div>
                      ))}
                    </div>
                    <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)', color: 'var(--text-muted)' }}>
                      AI drafted from your code in 3 seconds
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="py-16 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: BsPlayCircle, color: '#34d399', title: 'Run & Preview', desc: 'Run HTML files, projects, and scripts. Output opens in a new window instantly — no configuration.', tag: 'Live' },
              { icon: BsGithub, color: '#818cf8', title: 'GitHub Import', desc: 'Import any public repo in one click. AI reads your code and starts contributing immediately.', tag: 'Import' },
              { icon: BsCpu, color: '#f59e0b', title: 'Direct File Writing', desc: 'The AI doesn\'t suggest code — it creates and edits files directly in your workspace.', tag: 'Unique' },
              { icon: BsDownload, color: '#f472b6', title: 'ZIP Export', desc: 'Download your entire project as a ZIP file with proper folder structure, ready to deploy.', tag: 'Export' },
              { icon: BsCodeSlash, color: '#60a5fa', title: 'Multi-language', desc: 'TypeScript, Python, Rust, Go, HTML, CSS, SQL — full syntax support with Monaco editor.', tag: '40+ langs' },
              { icon: HiLightningBolt, color: '#a78bfa', title: 'Autonomous Mode', desc: 'Enable autonomous mode and the AI can reason about its own logic to overcome limitations.', tag: 'Advanced' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="glass glass-hover rounded-2xl p-5 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: f.color + '18', border: `1px solid ${f.color}25` }}>
                      <Icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: f.color + '18', color: f.color }}>{f.tag}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Linux Sandbox + GitHub ── */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-7 relative overflow-hidden group">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
              style={{ background: 'var(--accent)', filter: 'blur(32px)' }} />
            <BsTerminal className="w-8 h-8 mb-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-xl font-bold text-white mb-2">Linux Workspace Terminal</h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Real terminal commands inside your workspace. Run ls, cat, touch, rm, and more. The AI uses the terminal automatically when working on your project.
            </p>
            <div className="glass rounded-xl p-3 font-code text-xs" style={{ color: '#a3e635' }}>
              <span style={{ color: 'var(--accent)' }}>$</span> ls<br />
              <span style={{ color: 'var(--text-muted)' }}>index.html  style.css  app.js</span><br />
              <span style={{ color: 'var(--accent)' }}>$</span> <span className="animate-blink">▋</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-7 relative overflow-hidden group">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
              style={{ background: '#34d399', filter: 'blur(32px)' }} />
            <BsGithub className="w-8 h-8 mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-2">GitHub Integration</h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Import any public repository instantly. The AI reads your codebase, understands the context, and starts contributing right away.
            </p>
            <div className="flex gap-2 flex-wrap">
              {INTEGRATIONS.map(i => (
                <span key={i} className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>{i}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <BsStars className="w-8 h-8 mx-auto mb-6" style={{ color: 'var(--accent)' }} />
          <h2 className="text-4xl font-bold text-white mb-4">Ready to build with AI?</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Join 10,000+ developers already shipping with Nexios AI</p>
          <button onClick={goRegister} className="btn-primary px-9 py-4 text-base gap-2">
            Start for Free <HiArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <BsRobot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Nexios<span style={{ color: 'var(--accent)' }}>AI</span></span>
          </div>
          <div className="flex gap-6">
            {['Product', 'Company', 'Privacy', 'Terms'].map(l => (
              <Link key={l} href="#" className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>{l}</Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2025 Nexios AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
