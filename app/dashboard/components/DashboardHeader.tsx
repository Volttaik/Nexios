'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HiBell, 
  HiSearch,
  HiSun,
  HiMoon,
  HiOutlineMenuAlt2,
  HiGlobe
} from 'react-icons/hi';
import { BsGrid, BsRobot } from 'react-icons/bs';
import DashboardSidebar from './DashboardSidebar';

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  user: any;
  onLogout: () => void;
  onMobileMenuOpen: () => void;
  subdomain: string | null;
}

export default function DashboardHeader({ 
  toggleSidebar, 
  isSidebarOpen, 
  user, 
  onLogout,
  onMobileMenuOpen,
  subdomain
}: DashboardHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const notifications = [
    { id: 1, text: 'AI model training completed', time: '2 min ago', read: false },
    { id: 2, text: 'Weekly report ready', time: '1 hour ago', read: false },
    { id: 3, text: 'New feature available', time: '3 hours ago', read: true },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open mobile menu"
        >
          <HiOutlineMenuAlt2 className="w-5 h-5 text-gray-700" />
        </button>
        
        <button 
          onClick={toggleSidebar}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <HiOutlineMenuAlt2 className={`w-5 h-5 text-gray-700 transition-transform duration-300 ${
            isSidebarOpen ? '' : 'rotate-180'
          }`} />
        </button>

        {/* Dynamic Subdomain Badge */}
        {subdomain && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
            <HiGlobe className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">{subdomain}</span>
          </div>
        )}
      </div>

      {/* Center - Search Bar */}
      <div className="hidden md:block flex-1 max-w-md mx-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiSearch className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {isDarkMode ? (
            <HiSun className="w-5 h-5 text-gray-700" />
          ) : (
            <HiMoon className="w-5 h-5 text-gray-700" />
          )}
        </button>

        {/* Apps Launcher */}
        <button className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <BsGrid className="w-5 h-5 text-gray-700" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          >
            <HiBell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  3 new
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    <p className="text-sm text-gray-900 mb-1">{notif.text}</p>
                    <p className="text-xs text-gray-400">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100">
                <button className="w-full text-center text-xs text-gray-500 hover:text-gray-900 transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Sidebar Dropdown */}
        <DashboardSidebar user={user} />
      </div>
    </header>
  );
}
