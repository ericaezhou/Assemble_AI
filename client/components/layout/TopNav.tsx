'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { getInitialsFromName } from '@/utils/name';
import ThemeSettings from '@/components/settings/ThemeSettings';

interface TopNavProps {
  currentView?: string;
}

export default function TopNav({ currentView }: TopNavProps) {
  const { user, logout } = useUserStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const initials = user?.name
    ? getInitialsFromName(user.name)
    : '?';

  return (
    <>
      <nav
        style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">

            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-1.5 group">
                <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
                  ASSEMBLE
                </span>
                <span
                  className="w-2 h-2 rounded-full transition-transform group-hover:scale-125"
                  style={{ background: 'var(--accent)' }}
                />
              </Link>

              {/* Nav links */}
              {user && (
                <div className="hidden sm:flex items-center gap-1">
                  {[
                    { href: '/',                    label: 'Home',     view: 'home' },
                    { href: `/profile/${user.id}`,  label: 'Profile',  view: 'profile' },
                    { href: '/messages',            label: 'Messages', view: 'messages' },
                  ].map(({ href, label, view }) => (
                    <Link
                      key={view}
                      href={href}
                      className="relative px-3 py-2 text-sm font-semibold transition-colors"
                      style={{ color: currentView === view ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {label}
                      {currentView === view && (
                        <span
                          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                          style={{ background: 'var(--accent)' }}
                        />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right side */}
            {user && (
              <div className="flex items-center gap-2">
                {/* Settings gear */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn btn-ghost"
                  style={{ padding: '6px 8px' }}
                  title="Customize theme"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                <button
                  onClick={handleLogout}
                  className="btn btn-ghost hidden sm:flex"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showSettings && <ThemeSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
