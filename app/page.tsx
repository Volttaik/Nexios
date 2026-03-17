'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiArrowRight, HiLightningBolt, HiCode, HiChip, HiGlobe } from 'react-icons/hi';
import { BsRobot, BsCpu, BsBarChart, BsShieldCheck, BsStars, BsTerminal, BsGithub } from 'react-icons/bs';
import Image from 'next/image';

const NAV_LINKS = ['Features', 'Pricing', 'Docs', 'Blog'];

const FEATURES = [
  { icon: BsCpu, title: 'AI Code Agent', desc: 'Write, debug & review code autonomously', tag: 'New' },
  { icon: BsBarChart, title: 'Predictive Analytics', desc: 'Real-time insights from your data', tag: '99.9%' },
  { icon: HiCode, title: 'Smart Workspace', desc: 'Full IDE with sandbox execution', tag: 'IDE' },
  { icon: BsRobot, title: 'AutoML Pipeline', desc: 'Automated model training & deployment', tag: '24/7' },
];

const STATS = [
  { value: '10K+', label: 'Developers' },
  { value: '500M+', label: 'API calls/mo' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<30ms', label: 'Latency' },
];

const INTEGRATIONS = ['GitHub', 'Vercel', 'Supabase', 'OpenAI', 'AWS', 'Docker'];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const goRegister = () => {
    setLoading(true);
    router.push('/register');
  };

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
        style={{ background: 'rgba(8,12,20,0.8)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)' }}>
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
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6">
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
              An enterprise AI workspace where your agent reads, writes, and debugs code — with a full sandbox, GitHub integration, and API intelligence built in.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap animate-slideUp" style={{ animationDelay: '0.2s' }}>
              <button onClick={goRegister} className="btn-primary px-7 py-3.5 text-base gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Start Building Free <HiArrowRight className="w-4 h-4" /></>}
              </button>
              <Link href="/login" className="btn-ghost px-7 py-3.5 text-base">
                <BsTerminal className="w-4 h-4" /> View Demo
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
              {STATS.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — mock IDE */}
          <div className="relative max-w-5xl mx-auto animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="glass rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 32px 64px rgba(0,0,0,0.5)' }}>
              {/* IDE topbar */}
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
              {/* IDE body */}
              <div className="grid grid-cols-5 divide-x" style={{ borderColor: 'var(--glass-border)', minHeight: 320 }}>
                {/* File tree */}
                <div className="col-span-1 p-3 space-y-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {['src/', '  index.ts', '  agent.ts', '  api/', '    routes.ts', 'README.md'].map((f, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded cursor-pointer transition-colors font-code"
                      style={{ color: i === 1 ? 'var(--accent)' : 'var(--text-muted)', background: i === 1 ? 'var(--accent-glow)' : 'transparent' }}>
                      {f}
                    </div>
                  ))}
                </div>
                {/* Code area */}
                <div className="col-span-3 p-4 font-code text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
                  <div><span style={{ color: '#818cf8' }}>import</span> <span style={{ color: '#34d399' }}>{'{ NexiosAgent }'}</span> <span style={{ color: '#818cf8' }}>from</span> <span style={{ color: '#fbbf24' }}>&apos;@nexios/core&apos;</span></div>
                  <div className="mt-2"><span style={{ color: '#818cf8' }}>const</span> <span style={{ color: '#60a5fa' }}>agent</span> = <span style={{ color: '#34d399' }}>new</span> <span style={{ color: '#f59e0b' }}>NexiosAgent</span>({'{'}</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>model</span>: <span style={{ color: '#fbbf24' }}>&apos;gemini-pro&apos;</span>,</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>sandbox</span>: <span style={{ color: '#818cf8' }}>true</span>,</div>
                  <div className="ml-4"><span style={{ color: '#94a3b8' }}>tools</span>: [<span style={{ color: '#fbbf24' }}>&apos;fs&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;terminal&apos;</span>, <span style={{ color: '#fbbf24' }}>&apos;github&apos;</span>]</div>
                  <div>{'}'});</div>
                  <div className="mt-3"><span style={{ color: '#94a3b8' }}>// Agent writes & runs code autonomously</span></div>
                  <div><span style={{ color: '#818cf8' }}>await</span> agent.<span style={{ color: '#60a5fa' }}>run</span>(<span style={{ color: '#fbbf24' }}>&apos;Build a REST API with auth&apos;</span>);</div>
                  <div className="mt-1 flex items-center gap-1.5"><span className="animate-blink" style={{ color: 'var(--accent)' }}>▋</span></div>
                </div>
                {/* AI panel */}
                <div className="col-span-1 p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>AI Agent</p>
                  {['Analysing...', 'Writing tests', 'Running sandbox', 'All checks ✓'].map((s, i) => (
                    <div key={i} className="text-xs px-2 py-1.5 rounded" style={{
                      background: i === 3 ? 'rgba(52,211,153,0.1)' : 'var(--bg-card)',
                      color: i === 3 ? '#34d399' : 'var(--text-muted)',
                      border: `1px solid ${i === 3 ? 'rgba(52,211,153,0.2)' : 'var(--glass-border)'}`,
                    }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Everything you need to ship</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>From ideation to production in a single AI-powered workspace</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="glass glass-hover rounded-2xl p-5 group cursor-pointer transition-all duration-300"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: 'var(--accent-glow)', border: '1px solid rgba(129,140,248,0.2)' }}>
                      <Icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent)' }}>{f.tag}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Large feature blocks */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="glass rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
                style={{ background: 'var(--accent)', filter: 'blur(32px)' }} />
              <BsTerminal className="w-8 h-8 mb-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-xl font-bold text-white mb-2">Linux Sandbox</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Execute code in a real browser-based sandbox. Run npm packages, test APIs, and see live output — no setup required.
              </p>
              <div className="glass rounded-xl p-3 font-code text-xs" style={{ color: '#a3e635' }}>
                <span style={{ color: 'var(--accent)' }}>$</span> node agent.ts<br />
                <span style={{ color: 'var(--text-muted)' }}>✓ Server started on port 3000</span><br />
                <span style={{ color: '#34d399' }}>✓ All 12 tests passed</span>
              </div>
            </div>

            <div className="glass rounded-2xl p-7 relative overflow-hidden group">
              <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
                style={{ background: '#34d399', filter: 'blur(32px)' }} />
              <BsGithub className="w-8 h-8 mb-4 text-white" />
              <h3 className="text-xl font-bold text-white mb-2">GitHub Integration</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                Import any public repository instantly. The AI agent reads your codebase, understands the context, and starts contributing.
              </p>
              <div className="flex gap-2 flex-wrap">
                {INTEGRATIONS.map(i => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>{i}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Intelligence */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{
              background: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.3) 0%, transparent 60%)',
            }} />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>API Intelligence</p>
                <h2 className="text-3xl font-bold text-white mb-4">Discover any API in seconds</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Our built-in API search agent helps you find, understand, and integrate any public API — with auto-generated code examples and authentication setup.
                </p>
                <button onClick={goRegister} className="btn-primary mt-6 gap-2">
                  Try API Search <HiArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {['Stripe Payments API → payment integration', 'OpenAI GPT-4 → AI completions', 'Twilio SMS → messaging', 'Weather API → real-time data'].map((api, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
                      <HiGlobe className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{api}</span>
                    <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--accent)' }}>Use →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <BsStars className="w-8 h-8 mx-auto mb-6" style={{ color: 'var(--accent)' }} />
          <h2 className="text-4xl font-bold text-white mb-4">Ready to build with AI?</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Join 10,000+ developers already using Nexios AI</p>
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
