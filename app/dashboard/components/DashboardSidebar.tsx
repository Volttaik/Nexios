'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AppUser } from '@/app/types/user';
import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrls?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
  sessionKey?: string;
}

export interface AIModel {
  id: string;
  name: string;
  tag: string;
  color: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: '2.0', color: '#4285F4', description: 'Fastest & latest' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: '1.5F', color: '#34A853', description: 'Fast & efficient' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: '1.5P', color: '#9B59B6', description: 'Most capable' },
];

interface DashboardSidebarProps {
  user: AppUser | null;
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: (newSession: ChatSession) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
  onLogout?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 4a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM11 4a1 1 0 011-1h5a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1V4zM2 13a1 1 0 011-1h5a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2zM11 10a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/chat',
    label: 'AI Chat',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/documents',
    label: 'Documents',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
];

function generateSessionKey() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function DashboardSidebar({
  user,
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onLogout,
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose,
  selectedModel: externalModel,
  onModelChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname === '/dashboard/chat';
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('gemini-2.0-flash');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = AI_MODELS.find(m => m.id === (externalModel || selectedModelId)) || AI_MODELS[0];

  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) setSelectedModelId(savedModel);
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);
  }, []);

  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const sessionsWithDates = parsed.map((s: Record<string, unknown>) => ({
          ...s,
          createdAt: new Date(s.createdAt as string),
          updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
            ...m,
            timestamp: new Date(m.timestamp as string),
          })),
          sessionKey: s.sessionKey || generateSessionKey(),
        }));
        setSessions(sessionsWithDates);
      } catch {
        console.error('Failed to load sessions');
      }
    }
  }, [currentChatId]);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) setShowModelMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem('selectedModel', modelId);
    if (onModelChange) onModelChange(modelId);
    setShowModelMenu(false);
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProfilePic(base64);
      localStorage.setItem('profilePicture', base64);
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.profilePicture = base64;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        id: Date.now().toString(),
        text: "Hello! I'm your Nexios AI assistant. How can I help you today?",
        sender: 'ai',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: "Hello! I'm your Nexios AI assistant...",
      sessionKey: generateSessionKey(),
    };
    setSessions(prev => [newSession, ...prev]);
    onNewChat(newSession);
    onMobileClose();
  };

  const handleSelectChat = (chatId: string) => {
    onChatSelect(chatId);
    onMobileClose();
    setChatMenuId(null);
  };

  const handleRenameSubmit = (chatId: string) => {
    if (editingTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: editingTitle.trim() } : s));
      if (onRenameChat) onRenameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== chatId));
    if (onDeleteChat) onDeleteChat(chatId);
    setChatMenuId(null);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
    setShowUserMenu(false);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const userId = user?._id || user?.id || 'N/A';

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-[#111113] border-r border-white/[0.07] z-40 flex flex-col transition-all duration-300
          ${isOpen ? 'w-72' : 'w-16'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo & Toggle */}
        <div className="h-14 flex items-center px-3 border-b border-white/[0.07] gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-white text-xs font-bold">NX</span>
          </div>
          {isOpen && (
            <>
              <span className="text-sm font-bold text-white truncate flex-1 tracking-tight">Nexios AI</span>
              <button onClick={onToggle} className="p-1.5 hover:bg-white/10 rounded-md transition-colors hidden md:flex items-center" aria-label="Collapse sidebar">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/50">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
          {!isOpen && (
            <button onClick={onToggle} className="mx-auto p-1.5 hover:bg-white/10 rounded-md transition-colors hidden md:flex items-center" aria-label="Expand sidebar">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/50">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="py-3 px-2 shrink-0">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-sm group relative
                    ${active ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'}
                    ${!isOpen ? 'justify-center' : ''}
                  `}
                  title={!isOpen ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {isOpen && <span className="truncate font-medium">{item.label}</span>}
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-r-full" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Model Selector */}
        <div className="px-2 py-2 border-t border-white/[0.07] shrink-0" ref={modelMenuRef}>
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left ${!isOpen ? 'justify-center' : ''}`}
            title={!isOpen ? 'Select model' : undefined}
          >
            <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: currentModel.color }}>
              {currentModel.tag}
            </div>
            {isOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{currentModel.name}</p>
                  <p className="text-[10px] text-white/30">{currentModel.description}</p>
                </div>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${showModelMenu ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>

          {showModelMenu && (
            <div className={`absolute ${isOpen ? 'left-2 right-2' : 'left-16 w-56'} bottom-32 mb-1 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden`}
              style={{ backdropFilter: 'blur(20px)', background: 'rgba(20,20,24,0.95)' }}>
              <div className="px-3 py-2 border-b border-white/[0.07]">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Select Model</p>
              </div>
              {AI_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.07] transition-colors text-left ${(externalModel || selectedModelId) === model.id ? 'bg-white/[0.1]' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: model.color }}>
                    {model.tag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90">{model.name}</p>
                    <p className="text-[11px] text-white/40">{model.description}</p>
                  </div>
                  {(externalModel || selectedModelId) === model.id && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-400 shrink-0">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Sessions — only on chat page */}
        {isChatPage && isOpen && (
          <div className="flex-1 overflow-y-auto border-t border-white/[0.07] pt-3" style={{ scrollbarWidth: 'none' }}>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                Chats ({sessions.length})
              </span>
              <button onClick={handleNewChat} className="p-1 hover:bg-white/10 rounded-md transition-colors" title="New chat">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/50">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="px-2 space-y-0.5">
              {sessions.map((chat) => (
                <div key={chat.id} className="relative group">
                  {editingChatId === chat.id ? (
                    <div className="p-2" onClick={e => e.stopPropagation()}>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(chat.id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        onBlur={() => handleRenameSubmit(chat.id)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:border-blue-400"
                        placeholder="Chat name..."
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSelectChat(chat.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors
                        ${currentChatId === chat.id ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'}
                      `}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0 text-white/30">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{chat.title}</p>
                        <p className="text-[10px] text-white/25 truncate">{formatDate(chat.updatedAt)}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setChatMenuId(chatMenuId === chat.id ? null : chat.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white/40">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {chatMenuId === chat.id && (
                    <div className="absolute right-0 mt-1 w-40 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                      style={{ backdropFilter: 'blur(20px)', background: 'rgba(20,20,24,0.97)' }}>
                      <button
                        onClick={() => { setEditingChatId(chat.id); setEditingTitle(chat.title); setChatMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={e => handleDeleteChat(chat.id, e)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-white/20">No chats yet</p>
                  <button onClick={handleNewChat} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Start a conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!isChatPage && isOpen && <div className="flex-1" />}
        {!isOpen && <div className="flex-1" />}

        {/* User Footer */}
        <div className="border-t border-white/[0.07] p-2 shrink-0" ref={userMenuRef}>
          {user ? (
            <>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors ${!isOpen ? 'justify-center' : ''}`}
              >
                <div className="relative shrink-0">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center ring-1 ring-white/20">
                      <span className="text-white text-xs font-bold">{user.fullName?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-[#111113]" />
                </div>
                {isOpen && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white/80 truncate">{user.fullName}</p>
                      <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>

              {showUserMenu && (
                <div className={`absolute ${isOpen ? 'left-2 right-2' : 'left-16 w-60'} bottom-14 mb-1 rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden`}
                  style={{ backdropFilter: 'blur(20px)', background: 'rgba(20,20,24,0.97)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{user.fullName?.[0]?.toUpperCase() || 'U'}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{user.fullName}</p>
                        <p className="text-xs text-white/40">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/25">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                      ID: <span className="font-mono">{String(userId).slice(-8)}</span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
                    <button
                      onClick={() => profileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white rounded-lg transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                      {profilePic ? 'Change Photo' : 'Upload Photo'}
                    </button>

                    <Link
                      href="/dashboard/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white rounded-lg transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      View Profile
                    </Link>

                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white rounded-lg transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Settings
                    </Link>

                    <div className="border-t border-white/[0.07] my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`flex items-center justify-center ${isOpen ? 'gap-2 px-2.5 py-2' : 'p-2'}`}>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/40">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              {isOpen && <span className="text-xs text-white/30">Not signed in</span>}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
