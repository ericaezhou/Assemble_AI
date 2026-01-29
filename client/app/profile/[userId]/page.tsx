'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserStore, UserProfile } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';
import FullProfile from '@/components/profile/FullProfile';
import { authenticatedFetch } from '@/utils/auth';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useUserStore();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId as string;
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    // Check authentication via Zustand store
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    fetchProfile();
  }, [userId, isAuthenticated, router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`/api/researchers/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfileUser(data);
    } catch (err) {
      setError('Could not load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav currentView="profile" />
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav currentView="profile" />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-600">{error || 'Profile not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Go back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav currentView="profile" />
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <FullProfile
          user={profileUser}
          isOwnProfile={isOwnProfile}
          onProfileUpdate={fetchProfile}
        />
      </div>
    </div>
  );
}
