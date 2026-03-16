'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCopy,
  faThumbsUp,
  faThumbsDown,
  faRobot,
  faImage,
  faXmark,
  faCheck,
  faSpinner,
  faPaperPlane
} from '@fortawesome/free-solid-svg-icons';
import ShareableLink from '@/app/components/ShareableLink';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { getTokenFromUrl } from '@/app/lib/tokenUtils';
import type { AppUser } from '@/app/types/user';
import Image from 'next/image';
import DashboardSidebar, { ChatSession } from '../components/DashboardSidebar';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrls?: string[];
}

// Define proper types for Gemini API
interface GeminiResponse {
  text?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ai, setAi] = useState<GoogleGenAI | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Initialize Gemini
  useEffect(() => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (API_KEY) {
      try {
        const geminiAI = new GoogleGenAI({ apiKey: API_KEY });
        setAi(geminiAI);
        console.log('Gemini initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Gemini:', error);
      }
    } else {
      console.error('Gemini API key is missing');
    }
  }, []);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    const urlToken = getTokenFromUrl();
    if (urlToken) {
      console.log('Token found in URL');
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Load sessions from localStorage
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
            timestamp: new Date(m.timestamp as string)
          }))
        })) as ChatSession[];
        setSessions(sessionsWithDates);
        if (sessionsWithDates.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessionsWithDates[0].id);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }
  }, [currentSessionId]);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
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
        const file = files[i];
        
        const compressedFile = await compressImage(file);
        newFiles.push(compressedFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          if (newPreviews.length === files.length) {
            setImagePreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(compressedFile);
      }
      
      setSelectedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Failed to process images:', error);
    } finally {
      setIsUploading(false);
    }
    
    // Clear the input value so the same file can be selected again
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
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        uploaded.push(data.url);
      } catch (error) {
        console.error('Failed to upload image:', error);
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
      const remainingSessions = sessions.filter(s => s.id !== chatId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      } else {
        setCurrentSessionId('');
      }
    }
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === chatId ? { ...session, title: newTitle } : session
    ));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chatSessions');
    window.location.href = '/login';
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId
        ? { 
            ...session, 
            title: firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : ''),
            updatedAt: new Date()
          }
        : session
    ));
  };

  const callGeminiAPI = async (prompt: string, imageUrls?: string[]): Promise<string> => {
    if (!ai) {
      return "AI service is not initialized. Please check your API key.";
    }

    try {
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      
      if (prompt.trim()) {
        contents.push({ text: prompt });
      }
      
      if (imageUrls && imageUrls.length > 0) {
        for (const url of imageUrls) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            
            const base64Data = (base64 as string).split(',')[1];
            
            contents.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            });
          } catch (error) {
            console.error('Failed to process image for Gemini:', error);
          }
        }
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: contents,
      }) as GeminiResponse;
      
      if (response && response.text) {
        return response.text;
      } else {
        return "I received an empty response. Please try again.";
      }
      
    } catch (error) {
      console.error('Gemini API error:', error);
      return `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || isUploading || !currentSession) return;

    setIsLoading(true);
    
    const uploadedUrls = await uploadImages();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      imageUrls: uploadedUrls,
    };

    setSessions(prev => prev.map(session => 
      session.id === currentSessionId
        ? { 
            ...session, 
            messages: [...session.messages, userMessage],
            updatedAt: new Date()
          }
        : session
    ));

    if (messages.filter(m => m.sender === 'user').length === 0) {
      updateSessionTitle(currentSessionId, input || 'Image message');
    }

    const currentInput = input;
    const currentImages = [...uploadedUrls];
    
    setInput('');
    setSelectedFiles([]);
    setImagePreviews([]);

    try {
      const geminiResponse = await callGeminiAPI(currentInput, currentImages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: geminiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId
          ? { 
              ...session, 
              messages: [...session.messages, aiMessage],
              updatedAt: new Date()
            }
          : session
      ));
    } catch (error) {
      console.error('Error in handleSend:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, an unexpected error occurred. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, errorMessage] }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-white">
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
      />

      {/* Main Chat Area - Edge to edge */}
      <div className="flex-1 flex flex-col h-full">
        {/* Ultra Compact Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white h-12 flex items-center px-3">
          <div className="flex justify-end items-center w-full">
            <ShareableLink path="/dashboard/chat" label="Share" />
          </div>
        </div>

        {/* Messages Area - Edge to edge, compact */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-2 max-w-[85%] ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Ultra Compact Avatar */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'user' 
                        ? 'bg-gray-100'
                        : 'bg-gray-900'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <span className="text-[10px] font-medium text-gray-600">
                        {user?.fullName?.charAt(0) || 'U'}
                      </span>
                    ) : (
                      <FontAwesomeIcon icon={faRobot} className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Message Content - Compact */}
                  <div className="flex-1">
                    <div className={`${message.sender === 'user' ? 'text-right' : ''}`}>
                      {/* Tiny Image Previews */}
                      {message.imageUrls && message.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1 justify-end">
                          {message.imageUrls.map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                              <Image
                                src={url}
                                alt="Uploaded"
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {message.text && (
                        <p className={`text-xs leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 inline-block max-w-full ${
                          message.sender === 'user'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {message.text}
                        </p>
                      )}
                    </div>
                    
                    {/* Ultra Compact Message Footer */}
                    <div className={`flex items-center gap-1 mt-0.5 ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className="text-[9px] text-gray-400">
                        {formatTime(message.timestamp)}
                      </span>
                      
                      {message.sender === 'ai' && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => copyToClipboard(message.text)}
                            className="text-gray-300 hover:text-gray-600 transition-colors p-0.5"
                            aria-label="Copy to clipboard"
                          >
                            <FontAwesomeIcon icon={faCopy} className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            className="text-gray-300 hover:text-gray-600 transition-colors p-0.5"
                            aria-label="Thumbs up"
                          >
                            <FontAwesomeIcon icon={faThumbsUp} className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            className="text-gray-300 hover:text-gray-600 transition-colors p-0.5"
                            aria-label="Thumbs down"
                          >
                            <FontAwesomeIcon icon={faThumbsDown} className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Compact Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-900">
                    <FontAwesomeIcon icon={faRobot} className="w-3 h-3 text-white" />
                  </div>
                  <div className="rounded-xl p-2 bg-gray-100">
                    <LoadingSpinner size="xs" color="black" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Ultra Compact Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <div className="px-3 py-2">
            {/* Tiny Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200 group">
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {isUploading && (
                  <div className="w-12 h-12 rounded-md border border-gray-200 flex items-center justify-center bg-gray-50">
                    <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Tiny Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  isUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Upload image"
              >
                <FontAwesomeIcon icon={faImage} className="w-3 h-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploading}
              />

              {/* Tiny Input */}
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Message..."
                  className="w-full px-3 py-1.5 text-xs bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-full outline-none focus:border-gray-300 resize-none"
                  rows={1}
                  style={{ minHeight: '28px', maxHeight: '80px' }}
                  disabled={isUploading}
                />
              </div>

              {/* Tiny Send Button */}
              <button
                onClick={handleSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || isUploading}
                className={`w-7 h-7 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${
                  (!input.trim() && selectedFiles.length === 0) || isLoading || isUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
                aria-label="Send message"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="w-3 h-3" />
              </button>
            </div>

            {/* Ultra Compact Footer */}
            <div className="flex justify-between items-center mt-1">
              <p className="text-[8px] text-gray-400">
                Gemini • Nexios
              </p>
              
              {typeof window !== 'undefined' && getTokenFromUrl() && (
                <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  <FontAwesomeIcon icon={faCheck} className="w-2 h-2" />
                  <span className="text-[8px] font-medium">Token</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
