'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore, UserProfile } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';
import FullProfile from '@/components/profile/FullProfile';
import EventsPanel from '@/components/profile/EventsPanel';
import { authenticatedFetch } from '@/utils/auth';

interface Conference {
  id: string;
  name: string;
  description?: string;
  location?: string;
  location_type: string;
  virtual_link?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  host_id: string;
  is_host: number;
  capacity?: number;
  price_type?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useUserStore();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId as string;
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    fetchProfile();
    fetchEvents();
  }, [userId, isAuthenticated, router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`/api/researchers/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfileUser(data);
    } catch (err) {
      setError('Could not load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await authenticatedFetch(`/api/researchers/${userId}/conferences`);
      if (!response.ok) return;
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <TopNav currentView="profile" />
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="animate-pulse space-y-4">
              <div className="h-48 rounded-lg" style={{ background: 'var(--border-light)' }} />
              <div className="h-32 rounded-lg" style={{ background: 'var(--border-light)' }} />
              <div className="h-24 rounded-lg" style={{ background: 'var(--border-light)' }} />
            </div>
            <div className="animate-pulse space-y-4">
              <div className="h-40 rounded-lg" style={{ background: 'var(--border-light)' }} />
              <div className="h-64 rounded-lg" style={{ background: 'var(--border-light)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <TopNav currentView="profile" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="card p-8 text-center">
            <p style={{ color: 'var(--text-muted)' }}>{error || 'Profile not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary mt-4"
            >
              Go back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopNav currentView="profile" />
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <FullProfile
            user={profileUser}
            isOwnProfile={isOwnProfile}
            onProfileUpdate={fetchProfile}
          />
          <EventsPanel
            events={events}
            isOwnProfile={isOwnProfile}
            userName={profileUser.name}
          />
        </div>
      </div>
    </div>
  );
}
