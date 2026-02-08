import { ref, set, onValue, off, type DataSnapshot } from 'firebase/database';
import { rtdb } from '../config/firebase';

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

/**
 * Set typing status for a user in a room
 */
export const setTypingStatus = async (
  roomId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> => {
  try {
    const typingRef = ref(rtdb, `rooms/${roomId}/typing/${userId}`);

    if (isTyping) {
      await set(typingRef, {
        userName,
        timestamp: Date.now(),
      });
    } else {
      // Remove the typing indicator
      await set(typingRef, null);
    }
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};

/**
 * Subscribe to typing indicators for a room
 * Returns a list of users currently typing (excluding the current user)
 */
export const subscribeToTyping = (
  roomId: string,
  currentUserId: string,
  callback: (typingUsers: TypingUser[]) => void
): (() => void) => {
  const typingRef = ref(rtdb, `rooms/${roomId}/typing`);

  const handleValue = (snapshot: DataSnapshot) => {
    const typingData = snapshot.val();
    const typingUsers: TypingUser[] = [];

    if (typingData) {
      const entries = Object.entries(typingData) as Array<
        [string, { userName: string; timestamp: number }]
      >;
      entries.forEach(([userId, data]) => {
        // Exclude current user and filter out stale typing indicators (>5s old)
        const age = Date.now() - data.timestamp;
        if (userId !== currentUserId && age < 5000) {
          typingUsers.push({
            userId,
            userName: data.userName,
            timestamp: data.timestamp,
          });
        }
      });
    }

    callback(typingUsers);
  };

  onValue(typingRef, handleValue);

  // Return unsubscribe function
  return () => {
    off(typingRef, 'value', handleValue);
  };
};
