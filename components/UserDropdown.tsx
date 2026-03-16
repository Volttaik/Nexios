'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/app/types/user';

interface UserDropdownProps {
  user?: AppUser | null;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div ref={ref} className="user-dropdown relative">
      <button
        className="user-dropdown-button px-3 py-1.5 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user?.fullName || 'User'}
      </button>
      {isOpen && (
        <div className="user-dropdown-content absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
