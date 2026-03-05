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
  const pendingIds = useRef<Set<number>>(new Set());

  const prevConversationIdRef = useRef(conversationId);
  const newMessageRef = useRef(newMessage);
  useEffect(() => { newMessageRef.current = newMessage; }, [newMessage]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!minimized) fetchMessages();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId, minimized]);

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
      pendingIds.current.delete(tempId);
      setMessages(prev =>
        prev.some(m => m.id === confirmedMsg.id)
          ? prev.filter(m => m.id !== tempId)
          : prev.map(m => m.id === tempId ? confirmedMsg : m)
      );
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

  const initials = otherUserName.charAt(0).toUpperCase();

  return (
    <div
      className="fixed bottom-0 z-50 flex flex-col w-[400px]"
      style={{
        right: 'calc(20% + 8px)',
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none rounded-t-lg"
        style={{ borderBottom: minimized ? 'none' : '2px solid var(--border)', background: 'var(--surface)' }}
        onClick={() => setMinimized(m => !m)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
          >
            {initials}
          </div>
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{otherUserName}</span>
        </div>
        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
            className="p-1.5 rounded transition-colors btn-ghost"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={minimized ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1.5 rounded transition-colors btn-ghost"
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
          <div
            className="overflow-y-auto px-4 py-3 space-y-2"
            style={{ height: '380px', background: 'var(--bg)' }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map(message => {
                if (message.is_system_message) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div
                        className="px-3 py-1.5 rounded-full text-xs text-center max-w-[90%]"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                }
                const isMe = message.sender_id === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className="px-3 py-2 text-sm leading-relaxed"
                        style={isMe
                          ? { background: 'var(--accent)', color: '#fff', borderRadius: '14px 14px 4px 14px' }
                          : { background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: '14px 14px 14px 4px' }
                        }
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>{formatTime(message.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3"
            style={{ borderTop: '2px solid var(--border)', background: 'var(--surface)' }}
          >
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Write a message…"
                disabled={sending}
                autoFocus
                className="flex-1 px-4 py-2 text-sm rounded-full outline-none transition-colors"
                style={{
                  background: 'var(--bg)',
                  border: '2px solid var(--border-light)',
                  color: 'var(--text)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-light)')}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="p-2.5 rounded-full flex-shrink-0 transition-colors disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}
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
