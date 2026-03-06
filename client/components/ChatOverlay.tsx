'use client';

import { useUserStore } from '@/store/userStore';
import FloatingChatWindow from '@/components/FloatingChatWindow';

export default function ChatOverlay() {
  const { user, floatingChat, chatDrafts, setFloatingChat, setChatDraft, unhideConversation } = useUserStore();

  if (!user || !floatingChat) return null;

  return (
    <FloatingChatWindow
      conversationId={floatingChat.id}
      otherUserName={floatingChat.name}
      otherUserId={floatingChat.userId}
      otherUserAvatarUrl={floatingChat.avatarUrl}
      currentUser={{ id: user.id, name: user.name }}
      draft={chatDrafts[floatingChat.id] ?? ''}
      onDraftChange={(convId, text) => setChatDraft(convId, text)}
      onClose={() => setFloatingChat(null)}
    />
  );
}
