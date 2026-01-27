'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import OnboardingForm from '@/components/OnboardingForm';
import Dashboard from '@/components/Dashboard';
import { authenticatedFetch, getCurrentUser, signOut } from '@/utils/auth';
import { useUserStore } from '@/store/userStore';

type ViewState = 'login' | 'signup' | 'dashboard';

export default function Home() {
  const { user, setUser, clearUser } = useUserStore();
  const [view, setView] = useState<ViewState>('login');
  const [loading, setLoading] = useState(true);

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
          } else {
            // Profile fetch failed, clear session
            await signOut();
            clearUser();
          }
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        // User not authenticated, stay on login view
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, clearUser]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700">
        <div className="text-white text-xl">Loading...</div>
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
