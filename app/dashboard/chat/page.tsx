'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import Image from 'next/image';
import DashboardSidebar, { ChatSession, AI_MODELS } from '../components/DashboardSidebar';
import type { AppUser } from '@/app/types/user';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrls?: string[];
  model?: string;
}

function UpArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ThumbUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  );
}

function ThumbDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
    </svg>
  );
}

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1h1a1 1 0 110 2H4v1a1 1 0 11-2 0v-1H1a1 1 0 110-2h1v-1a1 1 0 011-1zm12 0a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1zM8 14a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function renderMessageText(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let keyCount = 0;

  const flushCode = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={`code-${keyCount++}`} className="bg-gray-900 text-green-300 text-xs rounded-lg p-3 my-2 overflow-x-auto font-mono leading-relaxed">
          {codeLines.join('\n')}
        </pre>
      );
      codeLines = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={keyCount++} className="font-bold text-sm mt-2 mb-0.5">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={keyCount++} className="font-bold text-base mt-2 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={keyCount++} className="font-bold text-lg mt-2 mb-1">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={keyCount++} className="flex items-start gap-1.5 my-0.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line === '') {
      elements.push(<div key={keyCount++} className="h-2" />);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      elements.push(
        <div key={keyCount++}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={i} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }
  }
  if (inCode) flushCode();
  return elements;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
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
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.profilePicture) setProfilePic(parsed.profilePicture);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const savedModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash';
    setSelectedModel(savedModel);

    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);

    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (API_KEY) {
      try {
        setAi(new GoogleGenAI({ apiKey: API_KEY }));
      } catch {
        console.error('Failed to initialize Gemini');
      }
    }
  }, []);

  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const sessionsWithDates: ChatSession[] = parsed.map((s: Record<string, unknown>) => ({
          ...s,
          createdAt: new Date(s.createdAt as string),
          updatedAt: new Date(s.updatedAt as string),
          messages: (s.messages as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
            ...m,
            timestamp: new Date(m.timestamp as string),
          })),
        }));
        setSessions(sessionsWithDates);
        if (sessionsWithDates.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessionsWithDates[0].id);
        }
      } catch {
        console.error('Failed to load sessions');
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }
  };

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('selectedModel', modelId);
  }, []);

  const compressImage = (file: File, maxWidth = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploading(true);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newFiles.push(compressed);
        const reader = new FileReader();
        await new Promise<void>((res) => {
          reader.onload = (ev) => { newPreviews.push(ev.target?.result as string); res(); };
          reader.readAsDataURL(compressed);
        });
      }
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    } catch {
      console.error('Failed to process images');
    } finally {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    const uploaded: string[] = [];
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        if (response.ok) {
          const data = await response.json();
          uploaded.push(data.url);
        } else {
          const preview = imagePreviews[selectedFiles.indexOf(file)];
          if (preview) uploaded.push(preview);
        }
      } catch {
        const preview = imagePreviews[selectedFiles.indexOf(file)];
        if (preview) uploaded.push(preview);
      }
    }
    return uploaded;
  };

  const handleNewChat = (newSession: ChatSession) => {
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
    setSelectedFiles([]);
    setImagePreviews([]);
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentSessionId(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    setSessions(prev => prev.filter(s => s.id !== chatId));
    if (currentSessionId === chatId) {
      const remaining = sessions.filter(s => s.id !== chatId);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: newTitle } : s));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chatSessions');
    window.location.href = '/login';
  };

  const callGeminiAPI = async (prompt: string, imageBase64List?: string[]): Promise<string> => {
    if (!ai) return 'AI service is not configured. Please add your Gemini API key.';

    const activeModel = localStorage.getItem('selectedModel') || 'gemini-2.0-flash';

    try {
      const parts: Array<Record<string, unknown>> = [];
      if (prompt.trim()) parts.push({ text: prompt });

      if (imageBase64List && imageBase64List.length > 0) {
        for (const src of imageBase64List) {
          try {
            const isBase64 = src.startsWith('data:');
            let base64Data: string;
            let mimeType = 'image/jpeg';
            if (isBase64) {
              const match = src.match(/^data:([^;]+);base64,(.+)$/);
              if (match) { mimeType = match[1]; base64Data = match[2]; }
              else base64Data = src.split(',')[1];
            } else {
              const resp = await fetch(src);
              const blob = await resp.blob();
              base64Data = await new Promise<string>((res) => {
                const reader = new FileReader();
                reader.onloadend = () => { const r = reader.result as string; res(r.split(',')[1]); };
                reader.readAsDataURL(blob);
              });
            }
            parts.push({ inlineData: { mimeType, data: base64Data } });
          } catch {
            console.error('Failed to process image for Gemini');
          }
        }
      }

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: [{ role: 'user', parts }],
      });

      return response.text || 'I received an empty response. Please try again.';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('API key')) return 'Invalid API key. Please check your Gemini API key in settings.';
      if (msg.includes('quota')) return 'API quota exceeded. Please try again later.';
      if (msg.includes('model')) return `Model "${activeModel}" is not available. Please try a different model.`;
      return `Error: ${msg}. Please try again.`;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || isUploading) return;

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionKey: 'sess_' + Math.random().toString(36).substring(2, 15),
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      await new Promise(r => setTimeout(r, 50));
    }

    setIsLoading(true);

    const uploadedUrls = await uploadImages();
    const allImages = imagePreviews.length > 0 ? imagePreviews : uploadedUrls;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      imageUrls: uploadedUrls.length > 0 ? uploadedUrls : imagePreviews,
    };

    const sid = currentSessionId || sessions[0]?.id || '';

    setSessions(prev => prev.map(session =>
      session.id === sid
        ? { ...session, messages: [...session.messages, userMessage], updatedAt: new Date() }
        : session
    ));

    if (messages.filter(m => m.sender === 'user').length === 0) {
      setSessions(prev => prev.map(session =>
        session.id === sid
          ? { ...session, title: (input || 'Image message').slice(0, 35) + ((input.length > 35) ? '...' : '') }
          : session
      ));
    }

    const currentInput = input;
    const currentImages = [...allImages];
    setInput('');
    setSelectedFiles([]);
    setImagePreviews([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const geminiResponse = await callGeminiAPI(currentInput, currentImages);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: geminiResponse,
        sender: 'ai',
        timestamp: new Date(),
        model: localStorage.getItem('selectedModel') || 'gemini-2.0-flash',
      };
      setSessions(prev => prev.map(session =>
        session.id === sid
          ? { ...session, messages: [...session.messages, aiMessage], updatedAt: new Date() }
          : session
      ));
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, something went wrong. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, errorMsg] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m < 10 ? '0' + m : m} ${ampm}`;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentModelInfo = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      {/* Sidebar */}
      <DashboardSidebar
        user={user}
        currentChatId={currentSessionId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onMobileOpen={() => setMobileMenuOpen(true)}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />

      {/* Main Chat Area */}
      <div className={`flex flex-col h-full flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : 'md:ml-16'}`}>
        {/* Header */}
        <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-600">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: currentModelInfo.color }}>
                {currentModelInfo.tag}
              </div>
              <span className="text-xs font-medium text-gray-600 hidden sm:block">{currentModelInfo.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentSession && (
              <span className="text-xs text-gray-400 hidden sm:block">{currentSession.title}</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mb-4 shadow-lg">
                <RobotIcon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">How can I help you today?</h2>
              <p className="text-sm text-gray-500 max-w-sm mb-8">
                Powered by {currentModelInfo.name}. Ask me anything.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  'Explain quantum computing simply',
                  'Write a Python function to sort a list',
                  'What are the best practices for React?',
                  'Help me brainstorm startup ideas',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="text-left text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.sender === 'user' ? 'bg-gray-200' : 'bg-gray-900'}`}>
                    {message.sender === 'user' ? (
                      profilePic ? (
                        <img src={profilePic} alt="You" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-gray-600">{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
                      )
                    ) : (
                      <RobotIcon className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {message.imageUrls && message.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.imageUrls.map((url, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                            <Image src={url} alt="Uploaded" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {message.text && (
                      <div className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-gray-900 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        {message.sender === 'ai' ? renderMessageText(message.text) : message.text}
                      </div>
                    )}

                    <div className={`flex items-center gap-1.5 mt-1 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] text-gray-400">{formatTime(message.timestamp)}</span>
                      {message.sender === 'ai' && (
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => copyToClipboard(message.text, message.id)} className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded" title="Copy">
                            {copiedId === message.id ? <CheckIcon className="w-3 h-3 text-green-500" /> : <CopyIcon className="w-3 h-3" />}
                          </button>
                          <button className="p-1 text-gray-300 hover:text-green-500 transition-colors rounded" title="Helpful"><ThumbUpIcon className="w-3 h-3" /></button>
                          <button className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded" title="Not helpful"><ThumbDownIcon className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                    <RobotIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white/80 backdrop-blur-xl border-t border-gray-100">
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 max-w-3xl mx-auto">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                  <Image src={preview} alt="Preview" fill className="object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0 mb-0.5"
                title="Upload image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
                onKeyDown={handleKeyDown}
                placeholder="Message Nexios AI..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none resize-none leading-relaxed py-0.5"
                rows={1}
                style={{ minHeight: '22px', maxHeight: '140px' }}
                disabled={isUploading}
              />

              <button
                onClick={handleSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || isUploading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  (!input.trim() && selectedFiles.length === 0) || isLoading || isUploading
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                }`}
                title="Send"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UpArrowIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-gray-300">
                {currentModelInfo.name} · Nexios AI
              </p>
              <p className="text-[10px] text-gray-300">
                Shift + Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
