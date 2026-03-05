'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import OnboardingForm from '@/components/OnboardingForm';
import Dashboard from '@/components/Dashboard';
import { authenticatedFetch, getCurrentUser } from '@/utils/auth';
import { useUserStore } from '@/store/userStore';

type ViewState = 'login' | 'signup' | 'dashboard';

export default function Home() {
  const { user, isAuthenticated, setUser, clearUser } = useUserStore();
  // If user is already known from persisted store, skip the loading spinner
  const [view, setView] = useState<ViewState>(isAuthenticated && user ? 'dashboard' : 'login');
  const [loading, setLoading] = useState(!isAuthenticated || !user);

  useEffect(() => {
    // Check if user is already signed in via Supabase session
    const checkAuth = async () => {
      try {
        const authUser = await getCurrentUser();
        if (authUser) {
          // User is authenticated, fetch their profile from backend
          const res = await authenticatedFetch(`/api/researchers/${authUser.id}`);
          if (res.ok) {
            const profileData = await res.json();
            setUser(profileData);
            setView('dashboard');
          }
          // If profile fetch fails for a non-401 reason (transient error, slow server),
          // don't sign out — 401 is already handled by authenticatedFetch itself
        } else if (isAuthenticated) {
          // Session expired but store still thinks we're authenticated
          clearUser();
          setView('login');
        }
      } catch (err) {
        const error = err as Error;
        // AbortError means navigation happened mid-fetch — silently ignore
        if (error.name === 'AbortError') return;
        console.error('Error checking auth:', err);
        // User not authenticated, stay on login view
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, clearUser, isAuthenticated]);

  const handleLoginSuccess = async (userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/researchers/${userId}`);
      if (res.ok) {
        const profileData = await res.json();
        setUser(profileData);
        setView('dashboard');
      } else {
        console.error('Failed to fetch user profile after login');
      }
    } catch (err) {
      console.error('Error fetching user after login:', err);
    }
  };

  const handleSignupComplete = async (userId: string) => {
    try {
      const embeddingRes = await authenticatedFetch(`/api/researchers/${userId}/rebuild-embedding`, {
        method: 'POST',
      });
      if (!embeddingRes.ok) {
        console.error('Failed to rebuild embedding after signup');
        return;
      }

      const res = await authenticatedFetch(`/api/researchers/${userId}`);
      if (res.ok) {
        const profileData = await res.json();
        setUser(profileData);
        setView('dashboard');
      } else {
        console.error('Failed to fetch user profile after signup');
      }
    } catch (err) {
      console.error('Error fetching user after signup:', err);
    }
  };


  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>ASSEMBLE</span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
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
