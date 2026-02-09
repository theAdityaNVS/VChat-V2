import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Room, CreateRoomData } from '../types/room';

/**
 * Create a new room
 */
export const createRoom = async (roomData: CreateRoomData, userId: string): Promise<string> => {
  try {
    const roomsRef = collection(db, 'rooms');
    const newRoom = {
      name: roomData.name,
      type: roomData.type,
      members: [userId, ...(roomData.members || [])],
      createdBy: userId,
      createdAt: Timestamp.now(),
      description: roomData.description || '',
      lastMessageAt: Timestamp.now(),
    };

    const docRef = await addDoc(roomsRef, newRoom);
    return docRef.id;
  } catch (error) {
    console.error('Error creating room:', error);
    throw new Error('Failed to create room');
  }
};

/**
 * Get a room by ID
 */
export const getRoom = async (roomId: string): Promise<Room | null> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const data = roomSnap.data();
      return {
        id: roomSnap.id,
        name: data.name,
        type: data.type,
        members: data.members,
        createdBy: data.createdBy,
        createdAt: data.createdAt.toDate(),
        description: data.description,
        avatarUrl: data.avatarUrl,
        lastMessageAt: data.lastMessageAt?.toDate(),
        lastMessage: data.lastMessage,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting room:', error);
    throw new Error('Failed to get room');
  }
};

/**
 * Get all rooms for a user
 */
export const getUserRooms = async (userId: string): Promise<Room[]> => {
  try {
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('members', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const rooms: Room[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rooms.push({
        id: doc.id,
        name: data.name,
        type: data.type,
        members: data.members,
        createdBy: data.createdBy,
        createdAt: data.createdAt.toDate(),
        description: data.description,
        avatarUrl: data.avatarUrl,
        lastMessageAt: data.lastMessageAt?.toDate(),
        lastMessage: data.lastMessage,
      });
    });

    return rooms;
  } catch (error) {
    console.error('Error getting user rooms:', error);
    throw new Error('Failed to get rooms');
  }
};

/**
 * Subscribe to user's rooms in real-time
 * Includes both rooms where user is a member AND all public rooms
 */
export const subscribeToUserRooms = (
  userId: string,
  callback: (rooms: Room[]) => void
): (() => void) => {
  const roomsRef = collection(db, 'rooms');

  let memberRooms: Room[] = [];
  let publicRooms: Room[] = [];

  const mergeAndCallback = () => {
    // Combine rooms, removing duplicates (in case user is member of a public room)
    const roomMap = new Map<string, Room>();

    [...memberRooms, ...publicRooms].forEach((room) => {
      roomMap.set(room.id, room);
    });

    const allRooms = Array.from(roomMap.values()).sort((a, b) => {
      const timeA = a.lastMessageAt?.getTime() || 0;
      const timeB = b.lastMessageAt?.getTime() || 0;
      return timeB - timeA;
    });

    callback(allRooms);
  };

  // Subscribe to rooms where user is a member
  const memberQuery = query(
    roomsRef,
    where('members', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const unsubscribeMember = onSnapshot(
    memberQuery,
    (querySnapshot) => {
      memberRooms = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        memberRooms.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          members: data.members,
          createdBy: data.createdBy,
          createdAt: data.createdAt.toDate(),
          description: data.description,
          avatarUrl: data.avatarUrl,
          lastMessageAt: data.lastMessageAt?.toDate(),
          lastMessage: data.lastMessage,
        });
      });
      mergeAndCallback();
    },
    (error) => {
      console.error('Error subscribing to member rooms:', error);
    }
  );

  // Subscribe to all public rooms
  const publicQuery = query(
    roomsRef,
    where('type', '==', 'public'),
    orderBy('lastMessageAt', 'desc')
  );

  const unsubscribePublic = onSnapshot(
    publicQuery,
    (querySnapshot) => {
      publicRooms = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        publicRooms.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          members: data.members,
          createdBy: data.createdBy,
          createdAt: data.createdAt.toDate(),
          description: data.description,
          avatarUrl: data.avatarUrl,
          lastMessageAt: data.lastMessageAt?.toDate(),
          lastMessage: data.lastMessage,
        });
      });
      mergeAndCallback();
    },
    (error) => {
      console.error('Error subscribing to public rooms:', error);
    }
  );

  // Return cleanup function that unsubscribes from both
  return () => {
    unsubscribeMember();
    unsubscribePublic();
  };
};

/**
 * Update room details
 */
export const updateRoom = async (roomId: string, updates: Partial<Room>): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, updates);
  } catch (error) {
    console.error('Error updating room:', error);
    throw new Error('Failed to update room');
  }
};

/**
 * Add member to room
 */
export const addRoomMember = async (roomId: string, userId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      members: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error adding member:', error);
    throw new Error('Failed to add member');
  }
};

/**
 * Remove member from room
 */
export const removeRoomMember = async (roomId: string, userId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      members: arrayRemove(userId),
    });
  } catch (error) {
    console.error('Error removing member:', error);
    throw new Error('Failed to remove member');
  }
};

/**
 * Delete a room
 */
export const deleteRoom = async (roomId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);
  } catch (error) {
    console.error('Error deleting room:', error);
    throw new Error('Failed to delete room');
  }
};
