'use client';

import { useState, useEffect } from 'react';
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

export default function Home() {
  const [currentUser, setCurrentUser] = useState<Researcher | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`http://localhost:5000/api/researchers/${userId}`)
        .then(res => res.json())
        .then(data => {
          setCurrentUser(data);
          setIsOnboarded(true);
        })
        .catch(err => console.error('Error fetching user:', err));
    }
  }, []);

  const handleOnboardingComplete = (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    fetch(`http://localhost:5000/api/researchers/${userId}`)
      .then(res => res.json())
      .then(data => {
        setCurrentUser(data);
        setIsOnboarded(true);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setCurrentUser(null);
    setIsOnboarded(false);
  };

  return (
    <>
      {!isOnboarded ? (
        <OnboardingForm onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
}
