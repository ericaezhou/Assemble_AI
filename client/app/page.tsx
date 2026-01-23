'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import OnboardingForm from '@/components/OnboardingForm';
import Dashboard from '@/components/Dashboard';
import { useUserStore } from '@/store/userStore';

type ViewState = 'login' | 'signup' | 'dashboard';

export default function Home() {
  const { user, fetchUser, isAuthenticated } = useUserStore();
  const [view, setView] = useState<ViewState>('login');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && !isAuthenticated) {
      fetchUser(Number(userId)).then((userData) => {
        if (userData) {
          setView('dashboard');
        } else {
          localStorage.removeItem('userId');
          localStorage.removeItem('research_connect_token');
        }
        setIsInitialized(true);
      });
    } else if (isAuthenticated && user) {
      setView('dashboard');
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }
  }, []);

  const handleLoginSuccess = async (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    const userData = await fetchUser(userId);
    if (userData) {
      setView('dashboard');
    }
  };

  const handleSignupComplete = async (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    const userData = await fetchUser(userId);
    if (userData) {
      setView('dashboard');
    }
  };

  // Show loading state while checking auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      {view === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSignupClick={() => setView('signup')}
        />
      )}
      {view === 'signup' && (
        <OnboardingForm
          onComplete={handleSignupComplete}
          onBackToLogin={() => setView('login')}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard user={user} />
      )}
    </>
  );
}
