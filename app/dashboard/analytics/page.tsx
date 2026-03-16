'use client';

import { useEffect, useState } from 'react';
import type { ChatSession } from '../components/DashboardSidebar';

interface StatBlock {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: Record<string, unknown>) => ({
          ...s,
          createdAt: new Date(s.createdAt as string),
          updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
            ...m,
            timestamp: new Date(m.timestamp as string),
          })),
        })));
      } catch { /* ignore */ }
    }
  }, []);

  if (!mounted) return null;

  const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);
  const userMessages = sessions.reduce((acc, s) => acc + s.messages.filter(m => m.sender === 'user').length, 0);
  const aiMessages = totalMessages - userMessages;
  const totalChars = sessions.reduce((acc, s) => acc + s.messages.reduce((a, m) => a + m.text.length, 0), 0);
  const estimatedTokens = Math.floor(totalChars / 4);

  const stats: StatBlock[] = [
    { label: 'Total Sessions', value: sessions.length, sub: 'All time', color: 'bg-blue-500' },
    { label: 'Total Messages', value: totalMessages, sub: `${userMessages} sent / ${aiMessages} received`, color: 'bg-violet-500' },
    { label: 'Est. Tokens Used', value: estimatedTokens.toLocaleString(), sub: 'Approx. based on chars', color: 'bg-emerald-500' },
    { label: 'Avg. Messages/Chat', value: sessions.length > 0 ? (totalMessages / sessions.length).toFixed(1) : '0', sub: 'Per session', color: 'bg-orange-500' },
  ];

  const modelUsage = sessions.reduce<Record<string, number>>((acc, s) => {
    s.messages.forEach((m: Record<string, unknown>) => {
      if (m.sender === 'ai' && m.model) {
        const model = m.model as string;
        acc[model] = (acc[model] || 0) + 1;
      }
    });
    return acc;
  }, {});

  const recentActivity = sessions
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Your usage statistics and insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
              <div className="w-5 h-5 bg-white/30 rounded-md" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{s.label}</p>
            {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Usage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Model Usage</h2>
          {Object.keys(modelUsage).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(modelUsage).map(([model, count]) => {
                const pct = Math.round((count / aiMessages) * 100) || 0;
                return (
                  <div key={model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{model}</span>
                      <span className="text-gray-500">{count} responses ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No model data yet. Start chatting to see usage.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Recent Sessions</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{session.title}</p>
                    <p className="text-xs text-gray-400">{session.messages.length} messages</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No sessions yet. Start a chat first.</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Breakdown */}
      {totalMessages > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Message Breakdown</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-gray-900 transition-all" style={{ width: `${Math.round((userMessages / totalMessages) * 100)}%` }} />
              <div className="h-full bg-violet-400 transition-all" style={{ width: `${Math.round((aiMessages / totalMessages) * 100)}%` }} />
            </div>
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-900" />
              <span className="text-xs text-gray-600">Your messages ({userMessages})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-400" />
              <span className="text-xs text-gray-600">AI responses ({aiMessages})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
