'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import OnboardingForm from '@/components/OnboardingForm';
import Dashboard from '@/components/Dashboard';
import { authenticatedFetch, getCurrentUser, signOut } from '@/utils/auth';

interface Researcher {
  id: string; // Changed from number to string (UUID)
  name: string;
  email: string;
  institution: string;
  research_areas: string;
  bio: string;
  interests: string;
}

type ViewState = 'login' | 'signup' | 'dashboard';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<Researcher | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already signed in via Supabase session
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // User is authenticated, fetch their profile from backend
          const res = await authenticatedFetch(`/api/researchers/${user.id}`);
          const data = await res.json();
          setCurrentUser(data);
          setView('dashboard');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        // User not authenticated, stay on login view
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = async (userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/researchers/${userId}`);
      const data = await res.json();
      setCurrentUser(data);
      setView('dashboard');
    } catch (err) {
      console.error('Error fetching user after login:', err);
    }
  };

  const handleSignupComplete = async (userId: string) => {
    try {
      const res = await authenticatedFetch(`/api/researchers/${userId}`);
      const data = await res.json();
      setCurrentUser(data);
      setView('dashboard');
    } catch (err) {
      console.error('Error fetching user after signup:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(); // Sign out from Supabase
      setCurrentUser(null);
      setView('login');
    } catch (err) {
      console.error('Error signing out:', err);
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
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
}
