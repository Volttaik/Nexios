'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faRobot,
  faChartLine,
  faFileAlt,
  faCog,
} from '@fortawesome/free-solid-svg-icons';

interface DashboardSidebarProps {
  isOpen: boolean;
  user: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onClose?: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: faGauge },
  { href: '/dashboard/chat', label: 'AI Chat', icon: faRobot },
  { href: '/dashboard/analytics', label: 'Analytics', icon: faChartLine },
  { href: '/dashboard/documents', label: 'Documents', icon: faFileAlt },
  { href: '/dashboard/settings', label: 'Settings', icon: faCog },
];

export default function DashboardSidebar({
  isOpen,
  user,
  isMobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

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
          ${isOpen ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="Nexios AI"
              width={32}
              height={32}
              className="object-cover"
              priority
            />
          </div>
          {isOpen && (
            <span className="text-sm font-bold text-gray-900 truncate">
              Nexios AI
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${active
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4 shrink-0" />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        {user && (
          <div className="border-t border-gray-200 p-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {user.fullName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
