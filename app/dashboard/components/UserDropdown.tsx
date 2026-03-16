'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faCog } from '@fortawesome/free-solid-svg-icons';

interface UserDropdownProps {
  user: any;
  onLogout: () => void;
}

export default function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-black rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        <span className="text-white text-xs font-bold">
          {user?.fullName?.[0]?.toUpperCase() || 'U'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => { setIsOpen(false); router.push('/dashboard/settings'); }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faCog} className="w-4 h-4 text-gray-400" />
              Settings
            </button>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
