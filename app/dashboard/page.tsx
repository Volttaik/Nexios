'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/app/types/user';
import type { ChatSession } from './components/DashboardSidebar';
import { useAI } from '@/app/context/AIContext';
import { useTheme } from '@/app/context/ThemeContext';

const StatIcon = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
    <div style={{ color }}>{children}</div>
  </div>
);

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mounted, setMounted] = useState(false);
  const { activeProvider, activeModel } = useAI();
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

  const stats = [
    { label: 'Chat Sessions', value: sessions.length, color: '#3b82f6', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg> },
    { label: 'Messages', value: totalMessages, color: '#8b5cf6', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg> },
    { label: 'Est. Tokens', value: totalTokens.toLocaleString(), color: '#10b981', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> },
    { label: 'Projects', value: projects, color: '#f59e0b', icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" /><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 01-2-2v-2z" /></svg> },
  ];

  const quickLinks = [
    { href: '/dashboard/chat', label: 'New Chat', color: '#3b82f6' },
    { href: '/dashboard/projects', label: 'Projects', color: '#8b5cf6' },
    { href: '/dashboard/analytics', label: 'Analytics', color: '#10b981' },
    { href: '/dashboard/settings', label: 'Settings', color: '#f59e0b' },
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
            {sessions.length > 0 ? `${sessions.length} active sessions · ${activeProvider.shortName}/${activeModel.name}` : `Welcome to Nexios AI · Using ${activeProvider.shortName}`}
          </p>
        </div>
        <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-105"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
          title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl border p-5 hover:shadow-md transition-all" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <StatIcon color={s.color}>{s.icon}</StatIcon>
            <p className="text-2xl font-bold mt-3" style={{ color: 'var(--text)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent chats */}
        <div className="lg:col-span-2 rounded-2xl border p-6" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Recent Conversations</h2>
            <Link href="/dashboard/chat" className="text-sm text-blue-500 hover:text-blue-400 transition-colors">View all →</Link>
          </div>
          {sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.slice(0, 6).map(s => (
                <Link key={s.id} href="/dashboard/chat"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--bg3)' } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: activeProvider.color }}>
                    {activeProvider.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{s.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>{s.messages.length} messages</p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text3)' }}>{formatDate(s.updatedAt)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--bg3)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6" style={{ color: 'var(--text3)' }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--text2)' }}>No conversations yet</p>
              <Link href="/dashboard/chat" className="inline-block px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'var(--text)' }}>
                Start chatting
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active AI */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Active AI</h2>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: activeProvider.color }}>
                {activeProvider.icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{activeProvider.name}</p>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>{activeModel.name} · {activeModel.description}</p>
              </div>
            </div>
            <Link href="/dashboard/settings" className="block mt-3 text-xs text-center py-2 rounded-xl border transition-colors hover:border-blue-500"
              style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
              Manage providers →
            </Link>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-85 hover:scale-[1.02]"
                  style={{ background: l.color }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
