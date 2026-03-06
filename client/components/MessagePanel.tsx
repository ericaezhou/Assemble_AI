'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { usePublicSWR } from '@/hooks/useAuthSWR';
import { getInitialsFromName } from '@/utils/name';

interface Conversation {
  id: number;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_time: string;
}

interface MessagePanelProps {
  currentUser: { id: string; name: string };
  openConversationId?: number | null;
  onConversationOpened?: () => void;
  onOpenChat?: (conversationId: number, otherUserName: string, otherUserId: string, otherUserAvatar?: string) => void;
  drafts?: Record<number, string>;
  className?: string;
}

export default function MessagePanel({
  currentUser,
  openConversationId,
  onConversationOpened,
  onOpenChat,
  drafts = {},
  className,
}: MessagePanelProps) {
  const { hiddenConversationIds, hideConversation } = useUserStore();
  const { data: conversations = [], mutate: mutateConversations } = usePublicSWR<Conversation[]>(
    `/api/conversations/user/${currentUser.id}`,
    { refreshInterval: 1000 }
  );
  const [hoveredConvId, setHoveredConvId] = useState<number | null>(null);

  // When Connect creates a new conversation, find it and open the floating window
  useEffect(() => {
    if (openConversationId == null) return;
    const open = async () => {
      const convos = await mutateConversations();
      const target = convos?.find((c: Conversation) => c.id === openConversationId);
      if (target) onOpenChat?.(target.id, target.other_user_name, target.other_user_id, target.other_user_avatar);
      onConversationOpened?.();
    };
    open();
  }, [openConversationId]);

  const formatLastTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const defaultClass = 'card flex flex-col sticky top-20 h-[calc(100vh-100px)]';

  return (
    <div className={className ?? defaultClass}>
      {/* Header */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '2px solid var(--border-light)' }}
      >
        <h2 className="text-sm font-black" style={{ color: 'var(--text)' }}>Messages</h2>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.filter(c => !hiddenConversationIds.includes(c.id)).length === 0 ? (
          <div className="p-6 text-center mt-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--border-light)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
          </div>
        ) : (
          conversations
            .filter(c => !hiddenConversationIds.includes(c.id))
            .map(conv => (
              <div
                key={conv.id}
                className="relative"
                onMouseEnter={() => setHoveredConvId(conv.id)}
                onMouseLeave={() => setHoveredConvId(null)}
              >
                <button
                  onClick={() => onOpenChat?.(conv.id, conv.other_user_name, conv.other_user_id, conv.other_user_avatar)}
                  className="w-full text-left px-3 py-3 pr-8 transition-colors flex items-center gap-2.5"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 overflow-hidden"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
                  >
                    {conv.other_user_avatar ? (
                      <img src={conv.other_user_avatar} alt={conv.other_user_name} className="w-full h-full object-cover" />
                    ) : getInitialsFromName(conv.other_user_name)}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{conv.other_user_name}</span>
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{formatLastTime(conv.last_message_time)}</span>
                    </div>
                    {drafts[conv.id] ? (
                      <p className="text-xs truncate">
                        <span className="font-medium" style={{ color: 'var(--accent)' }}>Draft: </span>
                        <span style={{ color: 'var(--text-muted)' }}>{drafts[conv.id]}</span>
                      </p>
                    ) : conv.last_message ? (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{conv.last_message}</p>
                    ) : null}
                  </div>
                </button>
                {hoveredConvId === conv.id && (
                  <button
                    onClick={e => { e.stopPropagation(); hideConversation(conv.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    title="Remove conversation"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
