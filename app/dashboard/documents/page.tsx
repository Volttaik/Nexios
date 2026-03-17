'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ChatSession } from '../components/DashboardSidebar';

export default function DocumentsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'images' | 'text'>('all');

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

  const docs = sessions
    .filter(s => s.messages.length > 0)
    .map(s => ({
      id: s.id, title: s.title, date: new Date(s.updatedAt), messageCount: s.messages.length,
      hasImages: s.messages.some(m => m.imageUrls && m.imageUrls.length > 0),
      preview: s.messages.find(m => m.sender === 'user')?.text?.slice(0, 80) || 'No content',
    }))
    .filter(d => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.preview.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'images') return d.hasImages;
      if (filter === 'text') return !d.hasImages;
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Documents</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Your saved conversations and files</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text3)' }}>
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none border transition-colors"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'images', 'text'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2.5 text-sm rounded-xl font-medium transition-all"
              style={{ background: filter === f ? 'var(--text)' : 'var(--bg2)', color: filter === f ? 'var(--bg)' : 'var(--text2)', border: filter === f ? 'none' : '1px solid var(--border)' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: sessions.filter(s => s.messages.length > 0).length },
          { label: 'With Images', value: sessions.filter(s => s.messages.some(m => m.imageUrls && m.imageUrls.length > 0)).length },
          { label: 'Text Only', value: sessions.filter(s => s.messages.length > 0 && !s.messages.some(m => m.imageUrls && m.imageUrls.length > 0)).length },
        ].map((s, i) => (
          <div key={i} className="text-center p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {docs.map(doc => (
            <Link key={doc.id} href="/dashboard/chat"
              className="group p-5 hover:shadow-lg transition-all hover:scale-[1.01] block" style={{ ...card }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: doc.hasImages ? '#8b5cf620' : 'var(--bg3)' }}>
                  {doc.hasImages
                    ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-500"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    : <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: 'var(--text3)' }}><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                  }
                </div>
                <span className="text-xs" style={{ color: 'var(--text3)' }}>{doc.date.toLocaleDateString()}</span>
              </div>
              <h3 className="text-sm font-semibold mb-1 truncate" style={{ color: 'var(--text)' }}>{doc.title}</h3>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text2)' }}>{doc.preview}</p>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text3)' }}>
                <span>{doc.messageCount} messages</span>
                {doc.hasImages && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>Images</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'var(--bg2)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" style={{ color: 'var(--text3)' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>{search ? 'No matches' : 'No documents yet'}</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>{search ? 'Try a different search term' : 'Start a conversation to create documents'}</p>
          {!search && <Link href="/dashboard/chat" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'var(--text)' }}>Start a Chat</Link>}
        </div>
      )}
    </div>
  );
}
