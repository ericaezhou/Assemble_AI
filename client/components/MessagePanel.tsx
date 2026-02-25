'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Conversation {
  id: number;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_time: string;
}

interface MessagePanelProps {
  currentUser: { id: string; name: string };
  openConversationId?: number | null;
  onConversationOpened?: () => void;
  onOpenChat?: (conversationId: number, otherUserName: string) => void;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hoveredConvId, setHoveredConvId] = useState<number | null>(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 1000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // When Connect creates a new conversation, find it and open the floating window
  useEffect(() => {
    if (openConversationId == null) return;
    const open = async () => {
      const convos = await fetchConversations();
      const target = convos.find((c: Conversation) => c.id === openConversationId);
      if (target) onOpenChat?.(target.id, target.other_user_name);
      onConversationOpened?.();
    };
    open();
  }, [openConversationId]);

  const fetchConversations = async (): Promise<Conversation[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/user/${currentUser.id}`);
      const data = await res.json();
      const convos = Array.isArray(data) ? data : [];
      setConversations(convos);
      return convos;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  };

  const formatLastTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={className ?? 'bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sticky top-20 h-[calc(100vh-100px)]'}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
      </div>

      {/* Conversation list — always visible, never replaced */}
      <div className="flex-1 overflow-y-auto">
        {conversations.filter(c => !hiddenConversationIds.includes(c.id)).length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm mt-6">
            <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            No conversations yet
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
                  onClick={() => onOpenChat?.(conv.id, conv.other_user_name)}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors pr-8"
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-gray-800 text-sm truncate">{conv.other_user_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatLastTime(conv.last_message_time)}</span>
                  </div>
                  {drafts[conv.id] ? (
                    <p className="text-xs truncate">
                      <span className="text-amber-600 font-medium">Draft: </span>
                      <span className="text-gray-400">{drafts[conv.id]}</span>
                    </p>
                  ) : conv.last_message ? (
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  ) : null}
                </button>
                {hoveredConvId === conv.id && (
                  <button
                    onClick={e => { e.stopPropagation(); hideConversation(conv.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
