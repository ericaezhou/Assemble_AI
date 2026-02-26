'use client';

import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import TopNav from '@/components/layout/TopNav';

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

const DRAFTS_KEY = 'assemble-message-drafts';

export default function MessagesPage() {
  const { user, hiddenConversationIds, hideConversation } = useUserStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hoveredConvId, setHoveredConvId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem(DRAFTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvIdRef = useRef<number | null>(null);
  const newMessageRef = useRef(newMessage);
  useEffect(() => { newMessageRef.current = newMessage; }, [newMessage]);

  // Persist drafts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // On conversation switch: save old draft, restore new one
  useEffect(() => {
    const prevId = prevConvIdRef.current;
    if (prevId !== null && prevId !== activeConversation?.id) {
      setDrafts(prev => ({ ...prev, [prevId]: newMessageRef.current }));
    }
    prevConvIdRef.current = activeConversation?.id ?? null;
    if (activeConversation) {
      setNewMessage(drafts[activeConversation.id] ?? '');
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/user/${user.id}`);
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
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

  const handleDeleteConversation = (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    hideConversation(convId);
    if (activeConversation?.id === convId) setActiveConversation(null);
  };

  const handleNewMessageChange = (text: string) => {
    setNewMessage(text);
    if (activeConversation) {
      setDrafts(prev => ({ ...prev, [activeConversation.id]: text }));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user) return;
    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');
    setDrafts(prev => ({ ...prev, [activeConversation.id]: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content: textToSend,
        }),
      });
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(textToSend); // restore on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatLastTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please log in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav currentView="messages" />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Left: Conversation list */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-5 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Messaging</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.filter(c => !hiddenConversationIds.includes(c.id)).length === 0 ? (
              <div className="p-5 text-center text-gray-500 text-sm mt-8">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No conversations yet.</p>
                <p className="text-xs text-gray-400 mt-1">Connect with a researcher to start chatting!</p>
              </div>
            ) : (
              conversations.filter(c => !hiddenConversationIds.includes(c.id)).map(conv => (
                <div
                  key={conv.id}
                  className="relative"
                  onMouseEnter={() => setHoveredConvId(conv.id)}
                  onMouseLeave={() => setHoveredConvId(null)}
                >
                  <button
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      activeConversation?.id === conv.id
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 pr-6">
                      <span className="font-semibold text-gray-800 text-sm">{conv.other_user_name}</span>
                      <span className="text-xs text-gray-400">{formatLastTime(conv.last_message_time)}</span>
                    </div>
                    {drafts[conv.id] ? (
                      <p className="text-xs truncate pr-6">
                        <span className="text-amber-600 font-medium">Draft: </span>
                        <span className="text-gray-400">{drafts[conv.id]}</span>
                      </p>
                    ) : conv.last_message ? (
                      <p className="text-xs text-gray-500 truncate pr-6">{conv.last_message}</p>
                    ) : null}
                  </button>
                  {hoveredConvId === conv.id && (
                    <button
                      onClick={e => handleDeleteConversation(e, conv.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">Select a conversation</p>
                <p className="text-gray-400 text-sm mt-1">Choose from your conversations on the left</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">{activeConversation.other_user_name}</h2>
                <p className="text-sm text-gray-500">Active conversation</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => {
                    if (message.is_system_message) {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm max-w-lg text-center">
                            {message.content}
                          </div>
                        </div>
                      );
                    }
                    const isMe = message.sender_id === user.id;
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <span className="text-xs text-gray-500 px-3">{message.sender_name}</span>
                          )}
                          <div className={`px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <span className="text-xs text-gray-400 px-3">{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => handleNewMessageChange(e.target.value)}
                    placeholder="Write a message..."
                    disabled={sending}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
