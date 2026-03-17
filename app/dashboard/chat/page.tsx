'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import DashboardSidebar, { ChatSession } from '../components/DashboardSidebar';
import type { AppUser } from '@/app/types/user';
import { useAI } from '@/app/context/AIContext';
import { callAI, type ChatMessage } from '@/app/lib/ai';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrls?: string[];
  provider?: string;
  model?: string;
}


/* ── Icons ────────────────────────────────────────────────────────────────── */
const SendIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const ImageIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>;
const CopyIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>;
const CheckIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const BotIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8.5" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15" r="1" fill="currentColor" stroke="none"/></svg>;

function renderMarkdown(text: string) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const part of parts) {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const _lang = lines[0].replace('```', '').trim(); void _lang;
      const code = lines.slice(1, -1).join('\n');
      elements.push(<pre key={key++} className="my-2 rounded-xl overflow-x-auto text-xs leading-relaxed p-4 font-mono" style={{ background: '#1e1e2e', color: '#a6e3a1' }}><code>{code}</code></pre>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      elements.push(<code key={key++} className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.15)', color: 'inherit' }}>{part.slice(1,-1)}</code>);
    } else {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('### ')) elements.push(<h3 key={key++} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</h3>);
        else if (line.startsWith('## ')) elements.push(<h2 key={key++} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h2>);
        else if (line.startsWith('# ')) elements.push(<h1 key={key++} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h1>);
        else if (line.startsWith('- ') || line.startsWith('* ')) elements.push(<div key={key++} className="flex gap-2 my-0.5"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" /><span>{line.slice(2)}</span></div>);
        else if (line === '') elements.push(<div key={key++} className="h-1.5" />);
        else {
          const bold = line.split(/(\*\*[^*]+\*\*)/g);
          elements.push(<div key={key++}>{bold.map((b, i) => b.startsWith('**') ? <strong key={i}>{b.slice(2,-2)}</strong> : <span key={i}>{b}</span>)}</div>);
        }
      }
    }
  }
  return elements;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

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
  const messages = currentSession?.messages || [];

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
  }, []);

  useEffect(() => { if (sessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 150) + 'px'; }
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
    localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('chatSessions');
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
    const userMsg: Message = {
      id: genId(), text: input, sender: 'user', timestamp: new Date(),
      imageUrls: imagePreviews.length > 0 ? [...imagePreviews] : undefined,
    };
    const currentImages = [...imagePreviews];
    const currentInput = input;

    setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date(), title: s.messages.length === 0 ? (input || 'Image chat').slice(0, 40) : s.title } : s));
    setInput(''); setSelectedFiles([]); setImagePreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const history: ChatMessage[] = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text, imageBase64List: m.imageUrls }));
      const userChatMsg: ChatMessage = { role: 'user', content: currentInput, imageBase64List: currentImages.length > 0 ? currentImages : undefined };
      const allMessages = [...history, userChatMsg];

      const apiKey = getApiKey(activeProvider.id);
      const response = await callAI(activeProvider.id, activeModel.id, allMessages, apiKey);

      const aiMsg: Message = { id: genId(), text: response, sender: 'ai', timestamp: new Date(), provider: activeProvider.id, model: activeModel.id };
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, aiMsg], updatedAt: new Date() } : s));
    } catch {
      const errMsg: Message = { id: genId(), text: "⚠️ An error occurred. Please check your API key in the sidebar.", sender: 'ai', timestamp: new Date() };
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, errMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
  const formatTime = (d: Date) => { const h = d.getHours(); const m = d.getMinutes(); return `${h % 12 || 12}:${m < 10 ? '0' + m : m} ${h >= 12 ? 'PM' : 'AM'}`; };

  if (!mounted) return null;

  const providerColor = activeProvider.color;
  const mlClass = sidebarOpen ? 'md:ml-72' : 'md:ml-[60px]';

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'var(--bg)' }}>
      <DashboardSidebar
        user={user} currentChatId={currentSessionId} onChatSelect={setCurrentSessionId}
        onNewChat={handleNewChat} onDeleteChat={id => { setSessions(p => p.filter(s => s.id !== id)); if (currentSessionId === id) { const rem = sessions.filter(s => s.id !== id); setCurrentSessionId(rem[0]?.id || ''); } }}
        onRenameChat={(id, t) => setSessions(p => p.map(s => s.id === id ? { ...s, title: t } : s))}
        isOpen={sidebarOpen} onToggle={() => { const n = !sidebarOpen; setSidebarOpen(n); localStorage.setItem('nexios-sidebar-open', String(n)); }}
        isMobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} onMobileOpen={() => setMobileMenuOpen(true)}
        onLogout={handleLogout}
      />

      <div className={`flex flex-col h-full flex-1 transition-all duration-300 ${mlClass}`}>
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{ background: providerColor }}>
              {activeProvider.icon}
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>{activeProvider.shortName} / {activeModel.name}</span>
          </div>
          <span className="text-xs truncate max-w-xs" style={{ color: 'var(--text3)' }}>{currentSession?.title || 'New conversation'}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white" style={{ background: providerColor }}>
                <span className="text-lg font-bold">{activeProvider.icon}</span>
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>How can I help you?</h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>Powered by {activeProvider.name} · {activeModel.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {['Explain a concept simply', 'Write and debug code', 'Review my code for bugs', 'Help me brainstorm ideas'].map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="text-left text-sm px-4 py-3 rounded-xl border transition-all hover:shadow-sm"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? '' : 'text-white'}`}
                    style={{ background: msg.sender === 'user' ? 'var(--bg3)' : providerColor }}>
                    {msg.sender === 'user'
                      ? (profilePic ? <img src={profilePic} alt="You" className="w-8 h-8 rounded-full object-cover" /> : <span className="text-xs font-bold" style={{ color: 'var(--text2)' }}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>)
                      : <BotIcon />
                    }
                  </div>
                  <div className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.imageUrls?.map((url, i) => (
                      <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden mb-2 border" style={{ borderColor: 'var(--border)' }}>
                        <Image src={url} alt="img" fill className="object-cover" />
                      </div>
                    ))}
                    {msg.text && (
                      <div className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${msg.sender === 'user' ? 'rounded-tr-sm text-white' : 'rounded-tl-sm'}`}
                        style={{
                          background: msg.sender === 'user' ? 'var(--text)' : 'var(--bg2)',
                          color: msg.sender === 'user' ? 'var(--bg)' : 'var(--text)',
                          border: msg.sender === 'ai' ? `1px solid var(--border)` : 'none',
                        }}>
                        {msg.sender === 'ai' ? renderMarkdown(msg.text) : msg.text}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{formatTime(msg.timestamp)}</span>
                      {msg.sender === 'ai' && (
                        <>
                          <button onClick={() => copyText(msg.text, msg.id)} className="p-1 rounded transition-colors" style={{ color: 'var(--text3)' }} title="Copy">
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
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: providerColor }}><BotIcon /></div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="flex gap-1 items-center">
                      {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce-dot" style={{ background: 'var(--text3)', animationDelay: `${i*150}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mb-2 max-w-3xl mx-auto flex-wrap">
              {imagePreviews.map((p, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group border" style={{ borderColor: 'var(--border)' }}>
                  <Image src={p} alt="Preview" fill className="object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2.5 shadow-sm transition-all border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              {activeModel.supportsImages && (
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg transition-colors shrink-0 mb-0.5" style={{ color: 'var(--text3)' }} title="Attach image">
                  <ImageIcon />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Message ${activeProvider.shortName}…`}
                rows={1} className="flex-1 text-sm outline-none resize-none leading-relaxed py-0.5 bg-transparent"
                style={{ color: 'var(--text)', minHeight: 22, maxHeight: 150 }}
              />
              <button onClick={handleSend} disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 text-white ${(!input.trim() && selectedFiles.length === 0) || isLoading ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
                style={{ background: 'var(--text)' }}>
                {isLoading ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" /> : <SendIcon />}
              </button>
            </div>
            <p className="text-center text-[10px] mt-1.5" style={{ color: 'var(--text3)' }}>
              {activeProvider.shortName} / {activeModel.name} · Shift+Enter for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
