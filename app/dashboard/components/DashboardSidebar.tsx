'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faRobot,
  faChartLine,
  faFileAlt,
  faCog,
  faPlus,
  faMessage,
  faTrash,
  faBars,
  faXmark,
  faPen,
  faKey,
  faClock,
  faCopy,
  faCheck,
  faEllipsisVertical,
  faUser,
  faEnvelope,
  faCalendar,
  faIdCard,
  faSignOutAlt,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
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
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: faGauge },
  { href: '/dashboard/chat', label: 'AI Chat', icon: faRobot },
  { href: '/dashboard/analytics', label: 'Analytics', icon: faChartLine },
  { href: '/dashboard/documents', label: 'Documents', icon: faFileAlt },
  { href: '/dashboard/settings', label: 'Settings', icon: faCog },
];

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
  onMobileOpen
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const isChatPage = pathname === '/dashboard/chat';
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSessionInfo, setShowSessionInfo] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const pressedChatId = useRef<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const sessionsWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })),
          sessionKey: s.sessionKey || generateSessionKey()
        }));
        setSessions(sessionsWithDates);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateSessionKey = () => {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        id: Date.now().toString(),
        text: "Hello! I'm your Nexios AI assistant powered by Google Gemini. How can I help you today?",
        sender: 'ai',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: "Hello! I'm your Nexios AI assistant...",
      sessionKey: generateSessionKey()
    };
    
    setSessions(prev => [newSession, ...prev]);
    onNewChat(newSession);
    onMobileClose();
  };

  const handleSelectChat = (chatId: string) => {
    onChatSelect(chatId);
    onMobileClose();
    setShowSessionInfo(null);
  };

  // Long press handlers
  const handleMouseDown = (chatId: string) => {
    pressedChatId.current = chatId;
    longPressTimer.current = setTimeout(() => {
      if (pressedChatId.current === chatId) {
        const chat = sessions.find(s => s.id === chatId);
        if (chat) {
          setEditingChatId(chatId);
          setEditingTitle(chat.title);
        }
      }
    }, 500);
  };

  const handleMouseUp = () => {
    clearTimeout(longPressTimer.current);
    pressedChatId.current = null;
  };

  const handleMouseLeave = () => {
    clearTimeout(longPressTimer.current);
    pressedChatId.current = null;
  };

  const handleRenameSubmit = (chatId: string) => {
    if (editingTitle.trim()) {
      setSessions(prev => prev.map(s => 
        s.id === chatId ? { ...s, title: editingTitle.trim() } : s
      ));
      if (onRenameChat) {
        onRenameChat(chatId, editingTitle.trim());
      }
    }
    setEditingChatId(null);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      alert("You can't delete the last chat");
      return;
    }
    
    setSessions(prev => prev.filter(s => s.id !== chatId));
    if (onDeleteChat) {
      onDeleteChat(chatId);
    }
    setShowSessionInfo(null);
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleToggleSidebar = () => {
    onToggle();
    // If sidebar is being closed, also close user menu
    if (isOpen) {
      setShowUserMenu(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setShowUserMenu(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 flex flex-col transition-all duration-300
          ${isOpen ? 'w-80' : 'w-24'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo and toggle - Larger */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">NX</span>
          </div>
          {isOpen && (
            <>
              <span className="text-base font-bold text-gray-900 truncate flex-1">
                Nexios AI
              </span>
              <button
                onClick={handleToggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors hidden md:block"
                aria-label="Toggle sidebar"
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
          {!isOpen && (
            <button
              onClick={handleToggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors hidden md:block mx-auto"
              aria-label="Expand sidebar"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Nav Items - Larger */}
        <nav className="py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm
                    ${active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${!isOpen && 'justify-center'}
                  `}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5 shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Chat Sessions - Larger */}
        {isChatPage && isOpen && (
          <div className="flex-1 overflow-y-auto border-t border-gray-200 pt-4 scrollbar-hide"
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            <div className="px-4 mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Chat Sessions ({sessions.length})
              </span>
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                title="New chat"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {/* Larger chat items */}
            <div className="px-3 space-y-2">
              {sessions.map((chat) => (
                <div key={chat.id} className="relative">
                  {/* Main chat item */}
                  <div
                    onMouseDown={() => handleMouseDown(chat.id)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full rounded-lg transition-all ${
                      currentChatId === chat.id
                        ? 'bg-gray-100 ring-1 ring-gray-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {editingChatId === chat.id ? (
                      // Edit mode
                      <div className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(chat.id);
                            if (e.key === 'Escape') setEditingChatId(null);
                          }}
                          onBlur={() => handleRenameSubmit(chat.id)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Chat name..."
                        />
                      </div>
                    ) : (
                      // Chat display
                      <div className="flex items-start gap-3 p-3">
                        <FontAwesomeIcon icon={faMessage} className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {chat.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSessionInfo(showSessionInfo === chat.id ? null : chat.id);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FontAwesomeIcon icon={faEllipsisVertical} className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {formatDate(chat.updatedAt)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {chat.messages[chat.messages.length - 1]?.text.slice(0, 50) || 'No messages'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session Info Dropdown */}
                  {showSessionInfo === chat.id && (
                    <div className="absolute left-0 right-0 mt-2 mx-2 p-3 bg-white rounded-lg border border-gray-200 shadow-lg z-50 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700 flex items-center gap-2">
                            <FontAwesomeIcon icon={faKey} className="w-3.5 h-3.5" />
                            Session Key
                          </span>
                          <button
                            onClick={() => copyToClipboard(chat.sessionKey || '', chat.id)}
                            className="text-gray-500 hover:text-gray-700 p-1"
                          >
                            <FontAwesomeIcon 
                              icon={copiedKey === chat.id ? faCheck : faCopy} 
                              className="w-3.5 h-3.5" 
                            />
                          </button>
                        </div>
                        <code className="block p-2 bg-gray-50 rounded text-xs font-mono truncate">
                          {chat.sessionKey || 'No session key'}
                        </code>
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setEditingChatId(chat.id);
                              setEditingTitle(chat.title);
                              setShowSessionInfo(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Footer - Larger with dropdown menu */}
        {user && (
          <div className="border-t border-gray-200 p-3 shrink-0 relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors
                ${!isOpen && 'justify-center'}
              `}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">
                  {user.fullName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {isOpen && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <FontAwesomeIcon 
                    icon={showUserMenu ? faChevronUp : faChevronDown} 
                    className="w-3 h-3 text-gray-400"
                  />
                </>
              )}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && isOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Logged in as</p>
                  <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700">
                    <FontAwesomeIcon icon={faIdCard} className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">User ID</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {user.id || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">Email</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                  
                  {user.createdAt && (
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700">
                      <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 text-gray-400" />
                      <span className="flex-1">Member since</span>
                      <span className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-100 my-2"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Collapsed mode user indicator */}
            {!isOpen && (
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-16">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
