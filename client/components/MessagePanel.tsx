'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_name: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
}

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
  className?: string;
}

export default function MessagePanel({ currentUser, openConversationId, onConversationOpened, className }: MessagePanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [currentUser.id]);

  // When parent triggers a new conversation (via Connect button), open it
  useEffect(() => {
    if (openConversationId == null) return;

    const openConvo = async () => {
      const convos = await fetchConversations();
      const target = convos.find((c: Conversation) => c.id === openConversationId);
      if (target) setActiveConversation(target);
      onConversationOpened?.();
    };

    openConvo();
  }, [openConversationId]);

  useEffect(() => {
    if (activeConversation) fetchMessages(activeConversation.id);
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const fetchMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
        }),
      });
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={className ?? "bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sticky top-20 h-[calc(100vh-100px)]"}>
      {!activeConversation ? (
        /* ── Conversation list ── */
        <>
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-800">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm mt-6">
                <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                No conversations yet
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-medium text-gray-800 text-sm">{conv.other_user_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatLastTime(conv.last_message_time)}</span>
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        /* ── Inline chat view ── */
        <>
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveConversation(null)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800 truncate">{activeConversation.other_user_name}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-xs">Loading...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-xs">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map(message => {
                if (message.is_system_message) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs text-center max-w-full">
                        {message.content}
                      </div>
                    </div>
                  );
                }
                const isMe = message.sender_id === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-2xl text-sm ${
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

          <div className="border-t border-gray-200 px-3 py-2.5 flex-shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Write a message..."
                disabled={sending}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors text-gray-900"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
