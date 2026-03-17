'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MenuDropdown from './MenuDropdown';
import { HiMenu, HiX } from 'react-icons/hi';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const headerRef = useRef<HTMLElement>(null);

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);
  const closeMenu = (): void => setIsMenuOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) closeMenu();
    };
    if (isMenuOpen) setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isMenuOpen) closeMenu();
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isMenuOpen]);

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-md z-50 border-b border-gray-200/50">
      <div className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-2 ring-gray-200/50 group-hover:ring-gray-300/50 transition-all">
                <Image src="/images/logo.jpg" alt="Nexios AI Logo" width={36} height={36} className="object-cover group-hover:scale-110 transition-transform duration-300" priority />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Nexios</span>
                <span className="text-xl font-bold text-white bg-gradient-to-r from-gray-800 to-gray-700 px-2 py-0.5 rounded-lg ml-1 shadow-sm">AI</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
              Sign In
            </Link>
            <button onClick={toggleMenu}
              className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${isMenuOpen ? 'bg-gray-900' : 'hover:bg-gray-100/80'}`}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}>
              {isMenuOpen ? <HiX className="w-4 h-4 text-white" /> : <HiMenu className="w-4 h-4 text-gray-700" />}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute right-0">
            <MenuDropdown isOpen={isMenuOpen} onClose={closeMenu} />
          </div>
        </div>
      </div>
    </header>
  );
}
