'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars,
  faChevronLeft,
  faChevronRight,
  faUser,
  faArrowRightFromBracket,
  faBell,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import type { AppUser } from '@/app/types/user';
import { useState, useRef, useEffect } from 'react';

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  user: AppUser | null;
  onLogout: () => void;
  onMobileMenuOpen: () => void;
}

export default function DashboardHeader({ 
  toggleSidebar, 
  isSidebarOpen, 
  user, 
  onLogout, 
  onMobileMenuOpen
}: DashboardHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserMenuClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    // Close notifications if open
    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    // Close user menu if open
    if (isUserMenuOpen) setIsUserMenuOpen(false);
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    onLogout();
  };

  // Sample notifications (you can replace with real data)
  const notifications = [
    { id: 1, text: 'New feature: Image upload available', time: '5m ago', unread: true },
    { id: 2, text: 'Your chat session synced', time: '1h ago', unread: false },
    { id: 3, text: 'Weekly analytics report ready', time: '2h ago', unread: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuOpen}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Open mobile menu"
          >
            <FontAwesomeIcon icon={faBars} className="w-4 h-4 text-gray-600" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FontAwesomeIcon 
              icon={isSidebarOpen ? faChevronLeft : faChevronRight} 
              className="w-4 h-4 text-gray-600"
            />
          </button>

          <span className="text-sm font-semibold text-gray-900">Nexios AI</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Notifications with toggle */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={handleNotificationsClick}
              className={`p-1.5 rounded-lg hover:bg-gray-100 relative transition-colors ${
                isNotificationsOpen ? 'bg-gray-100' : ''
              }`}
              aria-label="Notifications"
            >
              <FontAwesomeIcon icon={faBell} className="w-4 h-4 text-gray-600" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-xs text-gray-800">{notification.text}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{notification.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-gray-500">No notifications</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 px-2 py-1">
                  <button className="text-[9px] text-blue-600 hover:text-blue-700 w-full text-center">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu with toggle */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={handleUserMenuClick}
              className={`flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                isUserMenuOpen ? 'bg-gray-100' : ''
              }`}
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                {user?.fullName ? (
                  <span className="text-xs font-medium text-gray-700">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-gray-500" />
                )}
              </div>
              <span className="hidden md:block text-xs font-medium text-gray-700">
                {user?.fullName?.split(' ')[0] || 'User'}
              </span>
              <FontAwesomeIcon 
                icon={isUserMenuOpen ? faChevronUp : faChevronDown} 
                className="w-2.5 h-2.5 text-gray-400 hidden md:block" 
              />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* User Info Header */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">{user?.fullName || 'User'}</p>
                  <p className="text-[9px] text-gray-500 truncate">{user?.email || 'user@example.com'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      // Navigate to profile
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-gray-400" />
                    Profile
                  </button>
                </div>

                {/* Logout Button */}
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-3 h-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
