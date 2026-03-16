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

  const sessionDocs = sessions
    .filter(s => s.messages.length > 0)
    .map(s => ({
      id: s.id,
      title: s.title,
      date: new Date(s.updatedAt),
      messageCount: s.messages.length,
      hasImages: s.messages.some((m: Record<string, unknown>) => m.imageUrls && (m.imageUrls as string[]).length > 0),
      preview: s.messages.find(m => m.sender === 'user')?.text?.slice(0, 80) || 'No content',
    }))
    .filter(doc => {
      if (search && !doc.title.toLowerCase().includes(search.toLowerCase()) && !doc.preview.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'images') return doc.hasImages;
      if (filter === 'text') return !doc.hasImages;
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Your saved conversations and shared files</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-gray-400 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'images', 'text'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Documents', value: sessions.filter(s => s.messages.length > 0).length },
          { label: 'With Images', value: sessions.filter(s => s.messages.some((m: Record<string, unknown>) => m.imageUrls && (m.imageUrls as string[]).length > 0)).length },
          { label: 'Text Only', value: sessions.filter(s => s.messages.length > 0 && !s.messages.some((m: Record<string, unknown>) => m.imageUrls && (m.imageUrls as string[]).length > 0)).length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Document Grid */}
      {sessionDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessionDocs.map((doc) => (
            <Link
              key={doc.id}
              href={`/dashboard/chat?chatId=${doc.id}`}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.hasImages ? 'bg-violet-50' : 'bg-gray-50'}`}>
                  {doc.hasImages ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-500">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-400">{doc.date.toLocaleDateString()}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5 truncate group-hover:text-black">{doc.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{doc.preview}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                {doc.messageCount} messages
                {doc.hasImages && <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full text-[10px] font-medium">Images</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-gray-300">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? 'No matches found' : 'No documents yet'}</h3>
          <p className="text-sm text-gray-500 mb-4">{search ? 'Try a different search term' : 'Start a conversation to create your first document'}</p>
          {!search && (
            <Link href="/dashboard/chat" className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              Start a Chat
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
