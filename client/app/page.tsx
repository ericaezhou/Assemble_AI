'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import OnboardingForm from '@/components/OnboardingForm';
import Dashboard from '@/components/Dashboard';

interface Researcher {
  id: number;
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

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`http://localhost:5000/api/researchers/${userId}`)
        .then(res => res.json())
        .then(data => {
          setCurrentUser(data);
          setView('dashboard');
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          localStorage.removeItem('userId');
        });
    }
  }, []);

  const handleLoginSuccess = (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    fetch(`http://localhost:5000/api/researchers/${userId}`)
      .then(res => res.json())
      .then(data => {
        setCurrentUser(data);
        setView('dashboard');
      });
  };

  const handleSignupComplete = (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    fetch(`http://localhost:5000/api/researchers/${userId}`)
      .then(res => res.json())
      .then(data => {
        setCurrentUser(data);
        setView('dashboard');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setCurrentUser(null);
    setView('login');
  };

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
