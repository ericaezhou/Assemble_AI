'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { authenticatedFetch } from '@/utils/auth';
import { getInitialsFromName } from '@/utils/name';

interface FriendProfile {
  id: string;
  name: string;
  avatar_url?: string;
  tagline?: string;
  occupation?: string;
  school?: string;
  major?: string;
  company?: string;
  title?: string;
}

interface FriendEntry {
  friendshipId: number;
  friend: FriendProfile;
  since: string;
}

interface RequestEntry {
  friendshipId: number;
  from: FriendProfile;
  createdAt: string;
}

interface FriendsData {
  friends: FriendEntry[];
  requests: RequestEntry[];
}

function getSubtitle(p: FriendProfile): string {
  if (p.tagline) return p.tagline;
  if (p.occupation === 'Student') return [p.major, p.school].filter(Boolean).join(' · ');
  if (p.occupation === 'Professional') return [p.title, p.company].filter(Boolean).join(' · ');
  return p.occupation || '';
}

function Avatar({ profile, size = 'md' }: { profile: FriendProfile; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base';
  return (
    <div
      className={`${dim} rounded-full overflow-hidden flex items-center justify-center font-black flex-shrink-0`}
      style={{
        background: profile.avatar_url ? 'transparent' : 'var(--accent-light)',
        color: 'var(--accent)',
        border: '2px solid var(--border)',
      }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
      ) : (
        getInitialsFromName(profile.name)
      )}
    </div>
  );
}

export default function FriendsPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [responding, setResponding] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  const { data, mutate, isLoading } = useAuthSWR<FriendsData>(
    user ? '/api/friends' : null
  );

  const friends = data?.friends || [];
  const requests = data?.requests || [];

  const handleRespond = async (friendshipId: number, action: 'accept' | 'reject') => {
    setResponding(friendshipId);
    try {
      const res = await authenticatedFetch(`/api/friends/${friendshipId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) mutate();
    } finally {
      setResponding(null);
    }
  };

  const handleRemove = async (friendshipId: number) => {
    setRemoving(friendshipId);
    try {
      const res = await authenticatedFetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } finally {
      setRemoving(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <TopNav currentView="friends" />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Please log in to view your friends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopNav currentView="friends" />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Pending requests */}
        {requests.length > 0 && (
          <section>
            <h2 className="text-lg font-black mb-4" style={{ color: 'var(--text)' }}>
              Friend Requests
              <span
                className="ml-2 text-sm font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {requests.length}
              </span>
            </h2>
            <div className="card divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {requests.map(req => (
                <div key={req.friendshipId} className="flex items-center gap-4 px-5 py-4">
                  <Link href={`/profile/${req.from.id}`}>
                    <Avatar profile={req.from} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${req.from.id}`}>
                      <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{req.from.name}</p>
                      {getSubtitle(req.from) && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{getSubtitle(req.from)}</p>
                      )}
                    </Link>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRespond(req.friendshipId, 'accept')}
                      disabled={responding === req.friendshipId}
                      className="btn btn-primary disabled:opacity-50"
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(req.friendshipId, 'reject')}
                      disabled={responding === req.friendshipId}
                      className="btn btn-ghost disabled:opacity-50"
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-lg font-black mb-4" style={{ color: 'var(--text)' }}>
            Friends
            {friends.length > 0 && (
              <span className="ml-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                {friends.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="card p-8 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="card p-10 text-center space-y-3">
              <p className="text-2xl">👋</p>
              <p className="font-black" style={{ color: 'var(--text)' }}>No friends yet</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Visit someone's profile and send them a friend request.
              </p>
              <button onClick={() => router.push('/')} className="btn btn-secondary mt-2">
                Explore people
              </button>
            </div>
          ) : (
            <div className="card divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {friends.map(entry => (
                <div key={entry.friendshipId} className="flex items-center gap-4 px-5 py-4">
                  <Link href={`/profile/${entry.friend.id}`}>
                    <Avatar profile={entry.friend} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${entry.friend.id}`}>
                      <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{entry.friend.name}</p>
                      {getSubtitle(entry.friend) && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{getSubtitle(entry.friend)}</p>
                      )}
                    </Link>
                  </div>
                  <button
                    onClick={() => handleRemove(entry.friendshipId)}
                    disabled={removing === entry.friendshipId}
                    className="btn-ghost rounded p-1.5 disabled:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                    title="Remove friend"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
