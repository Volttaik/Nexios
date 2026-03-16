'use client';

import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowUp,
  faCopy,
  faThumbsUp,
  faThumbsDown,
  faPlus,
  faRobot,
  faPaperclip,
  faFaceSmile,
  faSun,
  faMoon,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import ShareableLink from '@/app/components/ShareableLink';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { useSubdomain } from '@/app/components/SubdomainHandler';
import { getTokenFromUrl } from '@/app/lib/tokenUtils';
import type { AppUser } from '@/app/types/user';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your Nexios AI assistant powered by Google Gemini. How can I help you today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const subdomain = useSubdomain();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Check for token in URL
    const urlToken = getTokenFromUrl();
    if (urlToken) {
      console.log('Token found in URL:', urlToken.substring(0, 20) + '...');
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGeminiAPI = async (prompt: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Gemini API error:', data.error);
        return "I'm sorry, I encountered an error. Please try again.";
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return "I'm sorry, I'm having trouble connecting right now. Please try again.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Get response from Gemini
    const geminiResponse = await callGeminiAPI(input);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: geminiResponse,
      sender: 'ai',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Don't render until after mount
  if (!mounted) {
    return null;
  }

  return (
    <div className={`flex flex-col h-screen w-full px-4 md:px-12 lg:px-24 py-6 transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-white'
    }`}>
      {/* Header with Dark Mode Toggle and Share Button */}
      <div className="flex justify-end items-center gap-2 mb-4">
        {/* Shareable Link Button */}
        <ShareableLink path="/dashboard/chat" label="Share Chat" />
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            darkMode 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 max-w-5xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex gap-3 max-w-3xl ${
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    : darkMode ? 'bg-blue-600' : 'bg-gray-900'
                }`}
              >
                {message.sender === 'user' ? (
                  <span className={`text-xs font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user?.fullName?.charAt(0) || 'U'}
                  </span>
                ) : (
                  <FontAwesomeIcon icon={faRobot} className={`w-3 h-3 ${
                    darkMode ? 'text-white' : 'text-white'
                  }`} />
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1">
                <div className={`${message.sender === 'user' ? 'text-right' : ''}`}>
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    darkMode 
                      ? message.sender === 'user' ? 'text-gray-200' : 'text-gray-300'
                      : 'text-gray-800'
                  }`}>
                    {message.text}
                  </p>
                </div>
                
                {/* Message Footer */}
                <div className={`flex items-center gap-2 mt-0.5 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  <span className={`text-[10px] ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </span>
                  
                  {message.sender === 'ai' && (
                    <div className="flex items-center gap-1.5">
                      <button className={`transition-colors ${
                        darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                        <FontAwesomeIcon icon={faCopy} className="w-2.5 h-2.5" />
                      </button>
                      <button className={`transition-colors ${
                        darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                        <FontAwesomeIcon icon={faThumbsUp} className="w-2.5 h-2.5" />
                      </button>
                      <button className={`transition-colors ${
                        darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                        <FontAwesomeIcon icon={faThumbsDown} className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-blue-600' : 'bg-gray-900'
              }`}>
                <FontAwesomeIcon icon={faRobot} className="w-3 h-3 text-white" />
              </div>
              <div className={`rounded-2xl p-3 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <LoadingSpinner size="sm" color={darkMode ? 'white' : 'black'} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="max-w-5xl mx-auto w-full py-4">
        <div className="flex items-center gap-1.5">
          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className={`w-full px-4 py-3 text-sm rounded-full focus:ring-1 focus:ring-gray-300 outline-none resize-none transition ${
                darkMode 
                  ? 'bg-gray-800 text-gray-200 placeholder-gray-500 border-0' 
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-0'
              }`}
              rows={1}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>

          {/* Attachments Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                darkMode 
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
            </button>

            {/* Attachments Menu */}
            {showAttachments && (
              <div className={`absolute bottom-10 right-0 rounded-xl shadow-lg border p-1 min-w-36 z-50 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              }`}>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                  <FontAwesomeIcon icon={faPaperclip} className="w-3 h-3" />
                  <span>Attach file</span>
                </button>
                <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                  <FontAwesomeIcon icon={faFaceSmile} className="w-3 h-3" />
                  <span>Add emoji</span>
                </button>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
              !input.trim() || isLoading 
                ? darkMode 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : darkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3" />
          </button>
        </div>

        {/* Footer Note */}
        <div className="flex justify-between items-center mt-3">
          <p className={`text-[10px] ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Powered by Google Gemini • Nexios AI {subdomain && `• ${subdomain}`}
          </p>
          
          {/* Token Status Indicator */}
          {typeof window !== 'undefined' && getTokenFromUrl() && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
              darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <FontAwesomeIcon icon={faCheck} className="w-2 h-2" />
              <span className="text-[8px] font-medium">Token Auth</span>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
}
