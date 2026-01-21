'use client';

import Link from 'next/link';
import { useUserStore } from '@/store/userStore';

interface TopNavProps {
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export default function TopNav({ onNavigate, currentView }: TopNavProps) {
  const { user, logout } = useUserStore();

  const handleLogout = () => {
    logout();
    // Redirect to login page
    window.location.href = '/';
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Home */}
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              <span>Assemble AI</span>
            </Link>

            {/* Navigation Links */}
            {user && (
              <div className="hidden sm:flex items-center space-x-1">
                <button
                  onClick={() => onNavigate?.('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <Link
                  href={`/profile/${user.id}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'profile'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Right side - User info & Logout */}
          {user && (
            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-gray-600">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
