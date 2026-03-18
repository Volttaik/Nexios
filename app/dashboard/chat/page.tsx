'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import DashboardSidebar, { ChatSession } from '../components/DashboardSidebar';
import type { AppUser } from '@/app/types/user';
import { useAI } from '@/app/context/AIContext';
import { callAI, type ChatMessage } from '@/app/lib/ai';

interface Message {
  id: string; text: string; sender: 'user' | 'ai';
  timestamp: Date; imageUrls?: string[]; provider?: string; model?: string;
}

const SendIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>;
const ImageIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const CopyIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>;
const BotIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/></svg>;
const XIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

function renderMarkdown(text: string) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const part of parts) {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n');
      elements.push(
        <div key={key++} className="my-3 rounded-xl overflow-hidden text-xs" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          {lang && <div className="px-4 py-1.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{lang}</span>
          </div>}
          <pre className="overflow-x-auto p-4 leading-relaxed font-mono" style={{ color: '#a6e3a1', margin: 0 }}><code>{code}</code></pre>
        </div>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      elements.push(<code key={key++} className="px-1.5 py-0.5 rounded text-[11px] font-mono mx-0.5" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)' }}>{part.slice(1, -1)}</code>);
    } else {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('### ')) elements.push(<h3 key={key++} className="font-bold text-sm mt-4 mb-1.5">{line.slice(4)}</h3>);
        else if (line.startsWith('## ')) elements.push(<h2 key={key++} className="font-bold text-base mt-4 mb-1.5">{line.slice(3)}</h2>);
        else if (line.startsWith('# ')) elements.push(<h1 key={key++} className="font-bold text-lg mt-4 mb-1.5">{line.slice(2)}</h1>);
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          elements.push(
            <div key={key++} className="flex gap-2.5 my-1 items-start">
              <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
              <span className="leading-relaxed">{line.slice(2)}</span>
            </div>
          );
        }
        else if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.+)/);
          if (match) elements.push(
            <div key={key++} className="flex gap-2.5 my-1 items-start">
              <span className="font-bold shrink-0 text-xs mt-0.5" style={{ color: 'var(--accent)' }}>{match[1]}.</span>
              <span className="leading-relaxed">{match[2]}</span>
            </div>
          );
        }
        else if (line.startsWith('> ')) elements.push(
          <div key={key++} className="my-2 pl-3 border-l-2 italic opacity-70" style={{ borderColor: 'var(--accent)' }}>{line.slice(2)}</div>
        );
        else if (line === '') elements.push(<div key={key++} className="h-2" />);
        else {
          const bold = line.split(/(\*\*[^*]+\*\*)/g);
          elements.push(<div key={key++} className="leading-relaxed">{bold.map((b, i) => b.startsWith('**') ? <strong key={i}>{b.slice(2, -2)}</strong> : <span key={i}>{b}</span>)}</div>);
        }
      }
    }
  }
  return elements;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a REST API in Node.js',
  'Debug my Python code',
  'Create a business plan outline',
];

export default function ChatPage() {
  const { activeProvider, activeModel, getApiKey } = useAI();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages = useMemo(() => currentSession?.messages || [], [currentSessionId, sessions]);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) { const p = JSON.parse(userData); setUser(p); if (p.profilePicture) setProfilePic(p.profilePicture); }
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);
    const savedSidebar = localStorage.getItem('nexios-sidebar-open');
    if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const s = parsed.map((s: Record<string, unknown>) => ({
          ...s, createdAt: new Date(s.createdAt as string), updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map(m => ({ ...m, timestamp: new Date(m.timestamp as string) })),
        }));
        setSessions(s);
        if (s.length > 0 && !currentSessionId) setCurrentSessionId(s[0].id);
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  /* Mobile scroll lock */
  useEffect(() => {
    if (mobileMenuOpen) document.body.classList.add('menu-open');
    else document.body.classList.remove('menu-open');
    return () => document.body.classList.remove('menu-open');
  }, [mobileMenuOpen]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push(files[i]);
      await new Promise<void>(res => {
        const reader = new FileReader();
        reader.onload = ev => { newPreviews.push(ev.target?.result as string); res(); };
        reader.readAsDataURL(files[i]);
      });
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImage = (i: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleNewChat = (newSession: ChatSession) => {
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput(''); setSelectedFiles([]); setImagePreviews([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;
    let sid = currentSessionId;
    if (!sid) {
      const newSession: ChatSession = { id: genId(), title: 'New Chat', messages: [], createdAt: new Date(), updatedAt: new Date(), sessionKey: genId() };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      sid = newSession.id;
      await new Promise(r => setTimeout(r, 30));
    }
    setIsLoading(true);
    const userMsg: Message = { id: genId(), text: input, sender: 'user', timestamp: new Date(), imageUrls: imagePreviews.length > 0 ? [...imagePreviews] : undefined };
    const currentImages = [...imagePreviews];
    const currentInput = input;
    setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date(), title: s.messages.length === 0 ? (input || 'Image chat').slice(0, 42) : s.title } : s));
    setInput(''); setSelectedFiles([]); setImagePreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const history: ChatMessage[] = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text, imageBase64List: m.imageUrls }));
      const userChatMsg: ChatMessage = { role: 'user', content: currentInput, imageBase64List: currentImages.length > 0 ? currentImages : undefined };
      const apiKey = getApiKey(activeProvider.id);
      const response = await callAI(activeProvider.id, activeModel.id, [...history, userChatMsg], apiKey);
      const aiMsg: Message = { id: genId(), text: response, sender: 'ai', timestamp: new Date(), provider: activeProvider.id, model: activeModel.id };
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date() } : s));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const errMsg: Message = { id: genId(), text: `⚠️ Error: ${msg}`, sender: 'ai', timestamp: new Date() };
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, errMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
  const formatTime = (d: Date) => { const h = d.getHours(); const m = d.getMinutes(); return `${h % 12 || 12}:${m < 10 ? '0' + m : m} ${h >= 12 ? 'PM' : 'AM'}`; };

  if (!mounted) return null;

  const providerColor = activeProvider.color;
  const mlClass = sidebarOpen ? 'md:ml-72' : 'md:ml-16';

  return (
    <div className="fixed inset-0 z-20 flex" style={{ background: 'var(--bg)' }}>
      <DashboardSidebar
        user={user} currentChatId={currentSessionId} onChatSelect={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteChat={id => { setSessions(p => p.filter(s => s.id !== id)); if (currentSessionId === id) { const rem = sessions.filter(s => s.id !== id); setCurrentSessionId(rem[0]?.id || ''); } }}
        onRenameChat={(id, t) => setSessions(p => p.map(s => s.id === id ? { ...s, title: t } : s))}
        isOpen={sidebarOpen} onToggle={() => { const n = !sidebarOpen; setSidebarOpen(n); localStorage.setItem('nexios-sidebar-open', String(n)); }}
        isMobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} onMobileOpen={() => setMobileMenuOpen(true)}
        onLogout={handleLogout}
      />

      <div className={`flex flex-col h-full flex-1 min-w-0 transition-all duration-300 ${mlClass}`}>
        {/* Top bar */}
        <div className="h-12 flex items-center justify-between px-4 sm:px-5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-3 pl-10 md:pl-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: providerColor }}>
                {activeProvider.icon}
              </div>
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{activeProvider.shortName}</span>
                <span className="text-xs mx-1.5" style={{ color: 'var(--text3)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{activeModel.name}</span>
              </div>
            </div>
            {activeProvider.isFree && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#10b98120', color: '#10b981' }}>FREE</span>
            )}
          </div>
          <span className="text-xs truncate max-w-[200px] sm:max-w-xs hidden sm:block" style={{ color: 'var(--text3)' }}>
            {currentSession?.title || 'New conversation'}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 max-w-2xl mx-auto w-full">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-xl"
                style={{ background: `linear-gradient(135deg, ${providerColor}, ${providerColor}99)` }}>
                <span className="text-2xl font-bold text-white">{activeProvider.icon}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>How can I help you?</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>
                {activeProvider.name} · {activeModel.name}
                {activeProvider.isFree && <span className="ml-2 text-green-500 font-medium">✓ Free</span>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="text-left text-sm px-4 py-3.5 rounded-2xl border transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = providerColor + '60'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 w-full">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: msg.sender === 'user' ? 'var(--bg3)' : providerColor }}>
                    {msg.sender === 'user'
                      ? (profilePic
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={profilePic} alt="You" className="w-8 h-8 rounded-2xl object-cover" />
                          : <span className="text-xs font-bold" style={{ color: 'var(--text2)' }}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>)
                      : <span className="text-white"><BotIcon /></span>
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[82%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.imageUrls?.map((url, i) => (
                      <div key={i} className="relative w-36 h-36 rounded-2xl overflow-hidden mb-2 shadow-md"
                        style={{ border: '2px solid rgba(255,255,255,0.15)' }}>
                        <Image src={url} alt="Attached image" fill className="object-cover" />
                      </div>
                    ))}
                    {msg.text && (
                      <div className={`text-[13.5px] leading-relaxed px-4 py-3 shadow-sm ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                        {msg.sender === 'ai' ? renderMarkdown(msg.text) : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{formatTime(msg.timestamp ?? new Date())}</span>
                      {msg.sender === 'ai' && (
                        <>
                          <button onClick={() => copyText(msg.text, msg.id ?? '')} title="Copy"
                            className="p-1 rounded-lg transition-colors"
                            style={{ color: 'var(--text3)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                            {copiedId === msg.id ? <CheckIcon /> : <CopyIcon />}
                          </button>
                          {msg.provider && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                              {msg.provider}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading dots */}
              {isLoading && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm" style={{ background: providerColor }}>
                    <BotIcon />
                  </div>
                  <div className="bubble-ai px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-2 h-2 rounded-full animate-bounce-dot"
                          style={{ background: 'var(--text3)', animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mb-3 max-w-3xl mx-auto flex-wrap">
              {imagePreviews.map((p, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group shadow-sm" style={{ border: '1.5px solid var(--border)' }}>
                  <Image src={p} alt="Preview" fill className="object-cover" />
                  <button onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 px-3.5 py-2.5 rounded-2xl border transition-all shadow-sm"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              {activeModel.supportsImages && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-xl transition-colors shrink-0 mb-0.5"
                  style={{ color: 'var(--text3)' }}
                  title="Attach image"
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                  <ImageIcon />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Message ${activeProvider.shortName}…`}
                rows={1} className="flex-1 text-sm outline-none resize-none leading-relaxed py-1 bg-transparent"
                style={{ color: 'var(--text)', minHeight: 24, maxHeight: 160 }}
              />
              <button onClick={handleSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all shrink-0"
                style={{
                  background: (!input.trim() && selectedFiles.length === 0) || isLoading
                    ? 'var(--text3)'
                    : `linear-gradient(135deg, var(--accent), var(--accent2))`,
                  cursor: (!input.trim() && selectedFiles.length === 0) || isLoading ? 'not-allowed' : 'pointer',
                }}>
                {isLoading
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <SendIcon />}
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5" style={{ color: 'var(--text3)' }}>
              {activeProvider.shortName} · {activeModel.name} · Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
