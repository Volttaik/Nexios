'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRobot,
  faBolt,
  faChartLine,
  faFileAlt,
  faArrowRight,
  faSun,
  faMoon
} from '@fortawesome/free-solid-svg-icons';
import type { AppUser } from '@/app/types/user';

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration and dark mode
  useEffect(() => {
    setMounted(true);
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  if (!mounted) return null;

  const stats = [
    { label: 'Chat Sessions', value: '24', change: '+12%', icon: faRobot },
    { label: 'AI Models Used', value: '8', change: '+3', icon: faBolt },
    { label: 'Documents Processed', value: '156', change: '+28%', icon: faFileAlt },
    { label: 'Accuracy Rate', value: '98.5%', change: '+2.1%', icon: faChartLine },
  ];

  const recentChats = [
    { id: 1, title: 'AI Strategy Discussion', date: '2 hours ago', preview: 'Discussing implementation of machine learning models...' },
    { id: 2, title: 'Code Review Assistance', date: 'Yesterday', preview: 'Reviewing React components and optimization techniques...' },
    { id: 3, title: 'Data Analysis', date: '2 days ago', preview: 'Analyzing customer behavior patterns and trends...' },
  ];

  // Create a dynamic greeting based on user
  const getGreeting = () => {
    if (user?.fullName) {
      return `Welcome back, ${user.fullName}! 👋`;
    }
    return 'Welcome back, User! 👋';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-white'
    }`}>
      {/* Header with Dark Mode Toggle */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {getGreeting()}
          </h1>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            darkMode 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-6 rounded-xl border transition-all ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${
                  darkMode ? 'text-blue-400' : 'text-gray-700'
                }`} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                darkMode 
                  ? 'bg-green-900/30 text-green-400' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {stat.value}
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chats List */}
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Recent Chats
          </h2>
          <div className="space-y-3">
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                href="/dashboard/chat"
                className={`block p-4 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {chat.title}
                  </h3>
                  <span className={`text-xs ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {chat.date}
                  </span>
                </div>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {chat.preview}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href="/dashboard/chat"
            className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${
              darkMode 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-gray-900 hover:text-gray-700'
            }`}
          >
            View all chats
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick Actions */}
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/chat"
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <FontAwesomeIcon icon={faRobot} className={`w-5 h-5 ${
                  darkMode ? 'text-blue-400' : 'text-gray-700'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Start New Chat
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Begin a conversation with AI
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className={`w-4 h-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </Link>

            <Link
              href="/dashboard/analytics"
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <FontAwesomeIcon icon={faChartLine} className={`w-5 h-5 ${
                  darkMode ? 'text-blue-400' : 'text-gray-700'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  View Analytics
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Check your usage statistics
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className={`w-4 h-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </Link>

            <Link
              href="/dashboard/documents"
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <FontAwesomeIcon icon={faFileAlt} className={`w-5 h-5 ${
                  darkMode ? 'text-blue-400' : 'text-gray-700'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Manage Documents
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Upload and organize files
                </p>
              </div>
              <FontAwesomeIcon icon={faArrowRight} className={`w-4 h-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className={`mt-8 text-center text-xs ${
        darkMode ? 'text-gray-500' : 'text-gray-400'
      }`}>
        <p>Nexios AI Dashboard</p>
      </div>
    </div>
  );
}
