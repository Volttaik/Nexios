'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BsRobot, BsBarChart, BsCode, BsChatDots, BsStars, BsArrowUpRight, BsGithub } from 'react-icons/bs';
import { HiFolder, HiArrowRight, HiLightningBolt, HiChip } from 'react-icons/hi';
import type { AppUser } from '@/app/types/user';

const QUICK_ACTIONS = [
  { icon: BsCode, label: 'New Project', desc: 'Start coding with AI', href: '/dashboard/projects', color: '#818cf8' },
  { icon: BsChatDots, label: 'AI Chat', desc: 'Ask anything', href: '/dashboard/chat', color: '#34d399' },
  { icon: BsBarChart, label: 'Analytics', desc: 'View insights', href: '/dashboard/analytics', color: '#60a5fa' },
];

const RECENT_ACTIVITY = [
  { icon: BsRobot, text: 'AI agent completed code review', time: '2m ago', color: '#818cf8' },
  { icon: BsGithub, text: 'Imported repo: my-api-project', time: '15m ago', color: 'var(--text-secondary)' },
  { icon: HiLightningBolt, text: 'Sandbox executed 3 test cases', time: '1h ago', color: '#f59e0b' },
  { icon: BsChatDots, text: '14 messages with AI assistant', time: '2h ago', color: '#34d399' },
];

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good day');

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.06)' }}>
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'var(--accent)', filter: 'blur(32px)' }} />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{greeting}</p>
              <h1 className="text-2xl font-bold text-white">{user?.fullName || 'Developer'} 👋</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Your AI workspace is ready. What are we building today?
              </p>
            </div>
            <Link href="/dashboard/projects" className="btn-primary gap-2 text-sm">
              <BsCode className="w-4 h-4" /> New Project
            </Link>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 mt-6 pt-5 flex-wrap" style={{ borderTop: '1px solid var(--glass-border)' }}>
            {[
              { label: 'Projects', value: '3', icon: HiFolder },
              { label: 'AI Sessions', value: '24', icon: BsChatDots },
              { label: 'Lines Generated', value: '1.2k', icon: BsCode },
              { label: 'APIs Discovered', value: '8', icon: BsStars },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link key={i} href={a.href}
                className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group transition-all duration-200"
                style={{ '--hover-accent': a.color } as React.CSSProperties}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${a.color}18`, border: `1px solid ${a.color}33` }}>
                  <Icon className="w-5 h-5" style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{a.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                </div>
                <HiArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" style={{ color: a.color }} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent projects */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--accent)' }}>
              View all <BsArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {[
              { name: 'my-api-project', lang: 'TypeScript', time: '2h ago', status: 'active' },
              { name: 'ml-pipeline', lang: 'Python', time: '1d ago', status: 'idle' },
              { name: 'react-dashboard', lang: 'JavaScript', time: '3d ago', status: 'idle' },
            ].map((p, i) => (
              <Link key={i} href="/dashboard/projects"
                className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border-hover)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(129,140,248,0.1)' }}>
                  <BsCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.lang} · {p.time}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.status === 'active' ? '#34d399' : 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
          <Link href="/dashboard/projects"
            className="flex items-center justify-center gap-2 mt-3 p-2.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.3)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)'; }}>
            <HiFolder className="w-3.5 h-3.5" /> Create new project
          </Link>
        </div>

        {/* Activity */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${a.color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white leading-snug">{a.text}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI capability banner */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-8 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'var(--accent)', filter: 'blur(48px)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(129,140,248,0.2)' }}>
              <HiChip className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Code Agent is ready</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Opens full IDE workspace with sandbox, file tree & GitHub import</p>
            </div>
          </div>
          <Link href="/dashboard/projects" className="btn-primary text-sm gap-2">
            Launch Workspace <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
