import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Message, SendMessageData } from '../types/message';

/**
 * Send a message to a room
 */
export const sendMessage = async (
  roomId: string,
  userId: string,
  userName: string,
  messageData: SendMessageData,
  avatarUrl?: string
): Promise<string> => {
  try {
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const newMessage = {
      roomId,
      senderId: userId,
      senderName: userName,
      senderAvatar: avatarUrl || null,
      content: messageData.content,
      type: messageData.type || 'text',
      createdAt: serverTimestamp(),
      replyTo: messageData.replyTo || null,
      isEdited: false,
      isDeleted: false,
    };

    const docRef = await addDoc(messagesRef, newMessage);

    // Update room's lastMessage and lastMessageAt
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessage: messageData.content.substring(0, 100),
      lastMessageAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

/**
 * Subscribe to messages in a room
 */
export const subscribeToMessages = (
  roomId: string,
  callback: (messages: Message[]) => void,
  messageLimit: number = 100
): (() => void) => {
  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(messageLimit));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          roomId: data.roomId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          type: data.type,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          reactions: data.reactions,
          replyTo: data.replyTo,
          isEdited: data.isEdited,
          isDeleted: data.isDeleted,
        });
      });
      // Reverse to show oldest first
      callback(messages.reverse());
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
    }
  );

  return unsubscribe;
};

/**
 * Edit a message
 */
export const editMessage = async (
  roomId: string,
  messageId: string,
  newContent: string
): Promise<void> => {
  try {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await updateDoc(messageRef, {
      content: newContent,
      isEdited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error editing message:', error);
    throw new Error('Failed to edit message');
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (roomId: string, messageId: string): Promise<void> => {
  try {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await updateDoc(messageRef, {
      content: '[deleted]',
      isDeleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
};

/**
 * Toggle reaction on a message
 * If user already reacted with this emoji, remove it; otherwise add it
 */
export const toggleReaction = async (
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const data = messageDoc.data();
    const currentReactions = (data.reactions || []) as Array<{
      emoji: string;
      userId: string;
      userName: string;
    }>;

    // Check if user already reacted with this emoji
    const existingReactionIndex = currentReactions.findIndex(
      (r) => r.emoji === emoji && r.userId === userId
    );

    let newReactions;
    if (existingReactionIndex !== -1) {
      // Remove reaction
      newReactions = currentReactions.filter((_, index) => index !== existingReactionIndex);
    } else {
      // Add reaction
      newReactions = [...currentReactions, { emoji, userId, userName }];
    }

    await updateDoc(messageRef, {
      reactions: newReactions,
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw new Error('Failed to toggle reaction');
  }
};
