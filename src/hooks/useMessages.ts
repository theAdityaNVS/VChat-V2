import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  subscribeToMessages,
  sendMessage as sendMessageService,
  toggleReaction as toggleReactionService,
  editMessage as editMessageService,
  deleteMessage as deleteMessageService,
} from '../lib/messageService';
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

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!currentUser || !roomId) {
        setError('Must be logged in to react');
        return false;
      }

      const userName = userDoc?.displayName || currentUser.email || 'Anonymous';

      try {
        setError(null);
        await toggleReactionService(roomId, messageId, emoji, currentUser.uid, userName);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to toggle reaction';
        setError(message);
        return false;
      }
    },
    [currentUser, userDoc, roomId]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      if (!currentUser || !roomId) {
        setError('Must be logged in to edit messages');
        return false;
      }

      try {
        setError(null);
        await editMessageService(roomId, messageId, newContent);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to edit message';
        setError(message);
        return false;
      }
    },
    [currentUser, roomId]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!currentUser || !roomId) {
        setError('Must be logged in to delete messages');
        return false;
      }

      try {
        setError(null);
        await deleteMessageService(roomId, messageId);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete message';
        setError(message);
        return false;
      }
    },
    [currentUser, roomId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
  };
};
