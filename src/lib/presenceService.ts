import { useEffect } from 'react';
import { ref, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { doc, updateDoc } from 'firebase/firestore';
import { rtdb, db } from '../config/firebase';
import type { UserStatus } from '../types/user';

/**
 * Set user's online status in RTDB
 */
export const setUserOnline = async (userId: string): Promise<void> => {
  try {
    const userStatusRef = ref(rtdb, `status/${userId}`);

    // Set user as online
    await set(userStatusRef, {
      state: 'online',
      lastChanged: serverTimestamp(),
    });

    // When user disconnects, set them as offline
    await onDisconnect(userStatusRef).set({
      state: 'offline',
      lastChanged: serverTimestamp(),
    });

    // Also update Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: 'online',
      lastSeen: new Date(),
    });
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

/**
 * Set user's offline status
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  try {
    const userStatusRef = ref(rtdb, `status/${userId}`);
    await set(userStatusRef, {
      state: 'offline',
      lastChanged: serverTimestamp(),
    });

    // Update Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: 'offline',
      lastSeen: new Date(),
    });
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};

/**
 * Update user status (online/offline/away)
 */
export const updateUserStatus = async (userId: string, status: UserStatus): Promise<void> => {
  try {
    const userStatusRef = ref(rtdb, `status/${userId}`);
    await set(userStatusRef, {
      state: status,
      lastChanged: serverTimestamp(),
    });

    // Update Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status,
      lastSeen: new Date(),
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

/**
 * Hook to manage user presence
 */
export const usePresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    // Set user online when component mounts
    setUserOnline(userId);

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateUserStatus(userId, 'away');
      } else {
        updateUserStatus(userId, 'online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: set user offline when component unmounts
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setUserOffline(userId);
    };
  }, [userId]);
};
