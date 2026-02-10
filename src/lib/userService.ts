import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserDoc } from '../types/user';

/**
 * Get a user by ID
 */
export const getUser = async (userId: string): Promise<UserDoc | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: userSnap.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        status: data.status,
        bio: data.bio,
        createdAt: data.createdAt?.toDate(),
        lastSeen: data.lastSeen?.toDate(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('Failed to get user');
  }
};

/**
 * Get all users (for user discovery)
 */
export const getAllUsers = async (limitCount: number = 100): Promise<UserDoc[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('displayName'), limit(limitCount));

    const querySnapshot = await getDocs(q);
    const users: UserDoc[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        status: data.status,
        bio: data.bio,
        createdAt: data.createdAt?.toDate(),
        lastSeen: data.lastSeen?.toDate(),
      });
    });

    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw new Error('Failed to get users');
  }
};

/**
 * Search users by display name
 */
export const searchUsers = async (searchTerm: string): Promise<UserDoc[]> => {
  try {
    const usersRef = collection(db, 'users');
    // Note: Firestore doesn't support full-text search
    // This is a basic implementation - for better search, consider using Algolia or similar
    const q = query(
      usersRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    const users: UserDoc[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        status: data.status,
        bio: data.bio,
        createdAt: data.createdAt?.toDate(),
        lastSeen: data.lastSeen?.toDate(),
      });
    });

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw new Error('Failed to search users');
  }
};

/**
 * Subscribe to all users in real-time
 */
export const subscribeToUsers = (callback: (users: UserDoc[]) => void): (() => void) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('displayName'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const users: UserDoc[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          status: data.status,
          bio: data.bio,
          createdAt: data.createdAt?.toDate(),
          lastSeen: data.lastSeen?.toDate(),
        });
      });
      callback(users);
    },
    (error) => {
      console.error('Error subscribing to users:', error);
    }
  );

  return unsubscribe;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserDoc>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update profile');
  }
};
