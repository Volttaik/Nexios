// app/dashboard/components/DashboardHeader.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars,
  faChevronLeft,
  faChevronRight,
  faUser,
  faLogout,
  faBell
} from '@fortawesome/free-solid-svg-icons';
import type { AppUser } from '@/app/types/user';

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
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuOpen}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5 text-gray-600" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-2 rounded-lg hover:bg-gray-100"
          >
            <FontAwesomeIcon 
              icon={isSidebarOpen ? faChevronLeft : faChevronRight} 
              className="w-5 h-5 text-gray-600"
            />
          </button>

          {/* You can add a logo or title here if needed */}
          <span className="font-semibold text-gray-900">Nexios AI</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <FontAwesomeIcon icon={faBell} className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                {user?.fullName ? (
                  <span className="text-sm font-medium text-gray-700">
                    {user.fullName.charAt(0)}
                  </span>
                ) : (
                  <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.fullName || 'User'}
              </span>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block">
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faLogout} className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
