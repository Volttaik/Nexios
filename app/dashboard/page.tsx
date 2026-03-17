'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from './components/DashboardSidebar';
import { useAI } from '@/app/context/AIContext';
import { useTheme } from '@/app/context/ThemeContext';

/* ── Mini sparkline bar ────────────────────────────────────────────────────── */
function SparkBar({ color }: { color: string }) {
  const heights = [3, 5, 4, 7, 5, 8, 6, 9, 7, 10, 8, 12];
  return (
    <div className="flex items-end gap-px h-8 mt-2 opacity-40">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 4}%`, background: color }} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mounted, setMounted] = useState(false);
  const { activeProvider, activeModel, settings } = useAI();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    const s = localStorage.getItem('chatSessions');
    if (s) { try { const p = JSON.parse(s); setSessions(p.map((x: Record<string, unknown>) => ({ ...x, createdAt: new Date(x.createdAt as string), updatedAt: new Date(x.updatedAt as string), messages: (x.messages as Array<Record<string, unknown>>).map(m => ({ ...m, timestamp: new Date(m.timestamp as string) })) }))); } catch { /* ignore */ } }
  }, []);

  if (!mounted) return null;

  const totalMessages = sessions.reduce((a, s) => a + s.messages.length, 0);
  const totalTokens = Math.floor(sessions.reduce((a, s) => a + s.messages.reduce((b, m) => b + m.text.length, 0), 0) / 4);
  const projects = (() => { try { return JSON.parse(localStorage.getItem('nexios-projects') || '[]').length; } catch { return 0; } })();

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const formatDate = (d: Date) => { const diff = Date.now() - new Date(d).getTime(); const days = Math.floor(diff / 86400000); if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; return `${days}d ago`; };

  const configuredCount = Object.values(settings.providers).filter(p => p.apiKey).length;

  const stats = [
    { label: 'Chat Sessions', value: sessions.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg> },
    { label: 'Total Messages', value: totalMessages, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',
      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg> },
    { label: 'Est. Tokens Used', value: totalTokens.toLocaleString(), color: '#10b981', bg: 'rgba(16,185,129,0.08)',
      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> },
    { label: 'Active Projects', value: projects, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" /><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 01-2-2v-2z" /></svg> },
  ];

  const quickLinks = [
    { href: '/dashboard/chat', label: 'New Chat', color: '#3b82f6', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg> },
    { href: '/dashboard/projects', label: 'Projects', color: '#8b5cf6', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" /></svg> },
    { href: '/dashboard/analytics', label: 'Analytics', color: '#10b981', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg> },
    { href: '/dashboard/settings', label: 'Settings', color: '#f59e0b', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {greeting()}, {user?.fullName?.split(' ')[0] || 'Dev'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} · ${activeProvider.shortName} / ${activeModel.name}`
              : `Welcome to Nexios AI · ${activeProvider.name} active`}
          </p>
        </div>
        <button onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 group relative overflow-hidden"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"
              style={{ background: `radial-gradient(ellipse at top left, ${s.color}08 0%, transparent 70%)` }} />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold mt-3 tabular-nums" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text2)' }}>{s.label}</p>
              <SparkBar color={s.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent chats */}
        <div className="lg:col-span-2 rounded-2xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Recent Conversations</h2>
            <Link href="/dashboard/chat" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
              View all →
            </Link>
          </div>
          <div className="p-4">
            {sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.slice(0, 6).map(s => {
                  const msgProvider = s.messages.find(m => m.sender === 'ai')?.provider;
                  return (
                    <Link key={s.id} href="/dashboard/chat"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:scale-[1.005] group"
                      style={{ background: 'var(--bg3)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: activeProvider.color }}>
                        {msgProvider?.[0]?.toUpperCase() || activeProvider.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{s.title}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>
                          {s.messages.length} message{s.messages.length !== 1 ? 's' : ''}
                          {msgProvider ? ` · ${msgProvider}` : ''}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
                        style={{ color: 'var(--text3)', background: 'var(--bg2)' }}>
                        {formatDate(s.updatedAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-7 h-7">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No conversations yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>Start a chat with {activeProvider.name} to get going</p>
                <Link href="/dashboard/chat"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: activeProvider.color }}>
                  {activeProvider.icon} Start chatting
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active AI */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Active Provider</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
                  style={{ background: activeProvider.color }}>
                  {activeProvider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{activeProvider.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>{activeModel.name}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Active" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text3)' }}>
                <span>{configuredCount} provider{configuredCount !== 1 ? 's' : ''} configured</span>
                <Link href="/dashboard/settings" className="font-medium hover:underline" style={{ color: '#3b82f6' }}>Manage →</Link>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center gap-2 justify-center py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
                  style={{ background: l.color }}>
                  {l.icon}
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>System Status</h2>
            <div className="space-y-2">
              {[
                { label: 'AI Services', ok: true },
                { label: 'Sandbox', ok: true },
                { label: 'Storage', ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text2)' }}>{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="font-medium" style={{ color: item.ok ? '#10b981' : '#ef4444' }}>
                      {item.ok ? 'Operational' : 'Down'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
