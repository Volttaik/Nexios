'use client';

import { useEffect, useState } from 'react';
import type { ChatSession } from '../components/DashboardSidebar';
import { AI_PROVIDERS } from '@/app/context/AIContext';

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved).map((s: Record<string, unknown>) => ({
          ...s, createdAt: new Date(s.createdAt as string), updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map(m => ({ ...m, timestamp: new Date(m.timestamp as string) })),
        })));
      } catch { /* ignore */ }
    }
  }, []);

  if (!mounted) return null;

  const totalMessages = sessions.reduce((a, s) => a + s.messages.length, 0);
  const userMessages = sessions.reduce((a, s) => a + s.messages.filter(m => m.sender === 'user').length, 0);
  const aiMessages = totalMessages - userMessages;
  const totalChars = sessions.reduce((a, s) => a + s.messages.reduce((b, m) => b + m.text.length, 0), 0);
  const estTokens = Math.floor(totalChars / 4);

  const providerUsage = sessions.reduce<Record<string, number>>((acc, s) => {
    s.messages.forEach(m => {
      if (m.sender === 'ai' && m.provider) { acc[m.provider] = (acc[m.provider] || 0) + 1; }
    });
    return acc;
  }, {});

  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 };
  const stats = [
    { label: 'Sessions', value: sessions.length, color: '#3b82f6' },
    { label: 'Messages', value: totalMessages, sub: `${userMessages} sent / ${aiMessages} received`, color: '#8b5cf6' },
    { label: 'Est. Tokens', value: estTokens.toLocaleString(), color: '#10b981' },
    { label: 'Avg. Msgs/Session', value: sessions.length ? (totalMessages / sessions.length).toFixed(1) : '0', color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Your usage statistics and insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} style={card} className="hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color + '20' }}>
              <div className="w-5 h-5 rounded-lg" style={{ background: s.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text2)' }}>{s.label}</p>
            {s.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider usage */}
        <div style={card}>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Provider Usage</h2>
          {Object.keys(providerUsage).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(providerUsage).map(([pid, count]) => {
                const provider = AI_PROVIDERS.find(p => p.id === pid);
                const pct = aiMessages > 0 ? Math.round((count / aiMessages) * 100) : 0;
                return (
                  <div key={pid}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: provider?.color || '#888' }}>{provider?.icon}</div>
                        <span style={{ color: 'var(--text)' }}>{provider?.name || pid}</span>
                      </div>
                      <span style={{ color: 'var(--text2)' }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: provider?.color || '#888' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text3)' }}>
              <p className="text-sm">No provider data yet. Start chatting.</p>
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div style={card}>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Recent Sessions</h2>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{s.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{s.messages.length} messages</p>
                  </div>
                  <span className="text-xs ml-3" style={{ color: 'var(--text3)' }}>{new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text3)' }}>
              <p className="text-sm">No sessions yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Message breakdown */}
      {totalMessages > 0 && (
        <div style={card}>
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Message Breakdown</h2>
          <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--bg3)' }}>
            <div className="h-full transition-all" style={{ width: `${Math.round((userMessages / totalMessages) * 100)}%`, background: 'var(--text)' }} />
            <div className="h-full transition-all" style={{ width: `${Math.round((aiMessages / totalMessages) * 100)}%`, background: '#8b5cf6' }} />
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: 'var(--text)' }} /><span className="text-xs" style={{ color: 'var(--text2)' }}>You ({userMessages})</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-violet-500" /><span className="text-xs" style={{ color: 'var(--text2)' }}>AI ({aiMessages})</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
