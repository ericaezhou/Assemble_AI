'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore, UserProfile } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';
import FullProfile from '@/components/profile/FullProfile';
import EventsPanel from '@/components/profile/EventsPanel';
import { useAuthSWR } from '@/hooks/useAuthSWR';

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

  const userId = params.userId as string;
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const {
    data: profileUser,
    error: profileError,
    isLoading,
    mutate: mutateProfile,
  } = useAuthSWR<UserProfile>(
    isAuthenticated ? `/api/researchers/${userId}` : null
  );

  const { data: events = [] } = useAuthSWR<Conference[]>(
    isAuthenticated ? `/api/researchers/${userId}/conferences` : null
  );

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

  if (profileError || !profileUser) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <TopNav currentView="profile" />
        <div className="max-w-6xl mx-auto p-8">
          <div className="card p-8 text-center">
            <p style={{ color: 'var(--text-muted)' }}>{profileError?.message || 'Profile not found'}</p>
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
            onProfileUpdate={() => mutateProfile()}
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
