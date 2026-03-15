'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faChartLine, 
  faRobot, 
  faFileAlt, 
  faUser,
  faArrowRight,
  faBolt,
  faCog,
  faBell,
  faQuestionCircle,
  faRightToBracket,
  faUserPlus,
  faGauge,
  faRocket,
  faHeadset,
  faCircleQuestion,
  faBrain
} from '@fortawesome/free-solid-svg-icons';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MenuDropdown({ isOpen, onClose }: MenuDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  useEffect(() => {
    const handleClickInside = (event: MouseEvent) => {
      event.stopPropagation();
    };

    if (dropdownRef.current) {
      dropdownRef.current.addEventListener('click', handleClickInside);
    }

    return () => {
      if (dropdownRef.current) {
        dropdownRef.current.removeEventListener('click', handleClickInside);
      }
    };
  }, []);

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    setLoadingHref(href);
    onClose(); // Close the dropdown immediately
    
    // Show spinner for 2 seconds then navigate
    setTimeout(() => {
      router.push(href);
      // Reset loading state after navigation
      setTimeout(() => {
        setLoadingHref(null);
      }, 100);
    }, 2000);
  };

  if (!isOpen) return null;

  // Main menu options - Updated with Register, Login, Dashboard (brain icon), Try Nexios, Support, FAQ
  const mainMenuOptions = [
    { href: '/register', label: 'Register', icon: faUserPlus },
    { href: '/login', label: 'Login', icon: faRightToBracket },
    { href: '/dashboard', label: 'Dashboard', icon: faBrain }, // Brain icon for dashboard
    { href: '/try-nexios', label: 'Try Nexios', icon: faRocket },
    { href: '/support', label: 'Support', icon: faHeadset },
    { href: '/faq', label: 'FAQ', icon: faCircleQuestion },
  ];

  return (
    <>
      {/* Minimal Spinner - No background overlay */}
      {loadingHref && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Backdrop that starts below the header */}
      {isOpen && (
        <div 
          className="fixed inset-x-0 bottom-0 bg-black/20 z-40"
          style={{ top: '65px' }} // Adjust this to match your header height
          onClick={onClose}
        />
      )}
      
      {/* Solid Menu with Horizontal Grid */}
      <div 
        ref={dropdownRef}
        className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg z-50 overflow-hidden"
        style={{
          animation: 'slideDown 0.2s ease-out',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
          border: '1px solid #e5e7eb'
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-8 h-8 rounded-md overflow-hidden border border-gray-200">
              <Image
                src="/images/logo.jpg"
                alt="Nexios AI"
                width={32}
                height={32}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-black">Nexios AI</h3>
                <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-medium rounded">
                  PRO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Menu - Horizontal Grid */}
        <div className="p-3">
          <div className="grid grid-cols-3 gap-1">
            {mainMenuOptions.map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                style={{
                  animation: `fadeIn 0.2s ease-out ${index * 0.02}s both`
                }}
              >
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-md flex items-center justify-center">
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-black" />
                </div>
                <span className="text-[10px] font-medium text-black text-center">
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </div>
        
        {/* User Section */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-medium text-xs">G</span>
            </div>
            <div>
              <p className="text-xs font-medium text-black">Guest User</p>
              <p className="text-[9px] text-gray-500">Not logged in</p>
            </div>
          </div>
          <a
            href="/register"
            onClick={(e) => handleNavigation('/register', e)}
            className="px-2.5 py-1.5 bg-black hover:bg-gray-800 rounded-md text-[10px] font-medium text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FontAwesomeIcon icon={faUserPlus} className="w-2.5 h-2.5 text-white" />
            <span>Sign Up</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
