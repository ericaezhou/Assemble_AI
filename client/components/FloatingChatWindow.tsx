'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const POLL_INTERVAL_MS = 3000;

interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
}

interface FloatingChatWindowProps {
  conversationId: number;
  otherUserName: string;
  currentUser: { id: string; name: string };
  draft?: string;
  onDraftChange?: (conversationId: number, text: string) => void;
  onClose: () => void;
}

export default function FloatingChatWindow({
  conversationId,
  otherUserName,
  currentUser,
  draft = '',
  onDraftChange,
  onClose,
}: FloatingChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState(draft);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracks temp IDs of optimistic messages not yet confirmed by the server
  const pendingIds = useRef<Set<number>>(new Set());

  // Track previous conversationId and current newMessage via refs to avoid stale closures
  const prevConversationIdRef = useRef(conversationId);
  const newMessageRef = useRef(newMessage);
  useEffect(() => { newMessageRef.current = newMessage; }, [newMessage]);

  // When conversation switches: save old draft, reset input with new draft, fetch messages
  useEffect(() => {
    const prevId = prevConversationIdRef.current;
    if (prevId !== conversationId) {
      onDraftChange?.(prevId, newMessageRef.current);
      prevConversationIdRef.current = conversationId;
      pendingIds.current.clear();
    }
    setNewMessage(draft);
    fetchMessages();
  }, [conversationId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!minimized) fetchMessages();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId, minimized]);

  // Save draft on unmount
  useEffect(() => {
    return () => {
      onDraftChange?.(prevConversationIdRef.current, newMessageRef.current);
    };
  }, []);

  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(prev => {
          // Preserve any optimistic messages not yet confirmed by the server
          const serverIds = new Set(data.map((m: Message) => m.id));
          const stillPending = prev.filter(m => pendingIds.current.has(m.id) && !serverIds.has(m.id));
          return [...data, ...stillPending];
        });
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');
    onDraftChange?.(conversationId, '');

    // Optimistic update — show message instantly before server responds
    const tempId = Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: textToSend,
      is_system_message: false,
      created_at: new Date().toISOString(),
    };
    pendingIds.current.add(tempId);
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: textToSend,
        }),
      });
      const confirmedMsg = await res.json();
      // Swap optimistic message for the confirmed server response
      pendingIds.current.delete(tempId);
      setMessages(prev => prev.map(m => m.id === tempId ? confirmedMsg : m));
    } catch (err) {
      console.error('Error sending message:', err);
      pendingIds.current.delete(tempId);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="fixed bottom-0 z-50 bg-white rounded-t-xl shadow-2xl border border-gray-200 flex flex-col w-[400px]"
      style={{ right: 'calc(20% + 8px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer select-none rounded-t-xl bg-white"
        onClick={() => setMinimized(m => !m)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-semibold flex-shrink-0">
            {otherUserName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate">{otherUserName}</span>
        </div>
        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={minimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages area */}
          <div className="overflow-y-auto px-4 py-3 space-y-2 bg-gray-50" style={{ height: '380px' }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map(message => {
                if (message.is_system_message) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs text-center max-w-[90%]">
                        {message.content}
                      </div>
                    </div>
                  );
                }
                const isMe = message.sender_id === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <span className="text-xs text-gray-400 px-1">{formatTime(message.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3 bg-white">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Write a message…"
                disabled={sending}
                autoFocus
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:border-indigo-400 transition-colors text-gray-900"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
