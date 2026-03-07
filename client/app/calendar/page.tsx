'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/utils/auth';
import { useUserStore } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';
import CalendarProvider from '@/components/calendar/CalendarProvider';
import CalendarView from '@/components/calendar/CalendarView';

export default function CalendarPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const authUser = await getCurrentUser();
      if (!authUser && !isAuthenticated) {
        router.push('/');
        return;
      }
      setAuthChecked(true);
    };
    check();
  }, [router, isAuthenticated]);

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopNav currentView="calendar" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CalendarProvider>
          <CalendarView />
        </CalendarProvider>
      </main>
    </div>
  );
}
