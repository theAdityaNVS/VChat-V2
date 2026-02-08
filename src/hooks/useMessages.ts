import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { subscribeToMessages, sendMessage as sendMessageService } from '../lib/messageService';
import type { Message, SendMessageData } from '../types/message';

export const useMessages = (roomId: string | undefined) => {
  const { currentUser, userDoc } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!roomId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const unsubscribe = subscribeToMessages(roomId, (updatedMessages) => {
      setMessages(updatedMessages);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [roomId]);

  const sendMessage = useCallback(
    async (messageData: SendMessageData): Promise<boolean> => {
      if (!currentUser || !roomId) {
        setError('Must be logged in to send messages');
        return false;
      }

      const userName = userDoc?.displayName || currentUser.email || 'Anonymous';
      const avatarUrl = userDoc?.photoURL;

      try {
        setError(null);
        await sendMessageService(roomId, currentUser.uid, userName, messageData, avatarUrl);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        return false;
      }
    },
    [currentUser, userDoc, roomId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
  };
};
