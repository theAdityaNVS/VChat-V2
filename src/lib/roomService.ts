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
import type { Room, CreateRoomData, RoomType } from '../types/room';

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
      console.log('Member rooms:', memberRooms.length, memberRooms);
      mergeAndCallback();
    },
    (error) => {
      console.error('Error subscribing to member rooms:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
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
      console.log('Public rooms:', publicRooms.length, publicRooms);
      mergeAndCallback();
    },
    (error) => {
      console.error('Error subscribing to public rooms:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
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

/**
 * Join a public room (adds current user to members)
 */
export const joinRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }

    const roomData = roomSnap.data();

    // Only allow joining public rooms
    if (roomData.type !== 'public') {
      throw new Error('Can only join public rooms');
    }

    // Add user to members
    await updateDoc(roomRef, {
      members: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

/**
 * Create or get a direct message room between two users
 */
export const createDirectMessage = async (
  currentUserId: string,
  otherUserId: string,
  otherUserName: string
): Promise<string> => {
  try {
    // Check if a DM room already exists between these users
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('type', '==', 'direct'),
      where('members', 'array-contains', currentUserId)
    );

    const querySnapshot = await getDocs(q);
    let existingRoomId: string | null = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.members.includes(otherUserId) && data.members.length === 2) {
        existingRoomId = doc.id;
      }
    });

    if (existingRoomId) {
      return existingRoomId;
    }

    // Create new DM room
    const newRoom = {
      name: `DM with ${otherUserName}`,
      type: 'direct' as RoomType,
      members: [currentUserId, otherUserId],
      createdBy: currentUserId,
      createdAt: Timestamp.now(),
      description: '',
      lastMessageAt: Timestamp.now(),
    };

    const docRef = await addDoc(roomsRef, newRoom);
    return docRef.id;
  } catch (error) {
    console.error('Error creating direct message:', error);
    throw new Error('Failed to create direct message');
  }
};

/**
 * Request to join a private room
 */
export const requestToJoinRoom = async (
  roomId: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    const requestsRef = collection(db, 'rooms', roomId, 'joinRequests');
    const requestDocRef = doc(requestsRef, userId);

    // Check if request already exists
    const requestSnap = await getDoc(requestDocRef);
    if (requestSnap.exists()) {
      throw new Error('Join request already sent');
    }

    await addDoc(requestsRef, {
      userId,
      userName,
      status: 'pending',
      requestedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error requesting to join room:', error);
    throw error;
  }
};

/**
 * Get pending join requests for a room
 */
export const getRoomJoinRequests = async (roomId: string) => {
  try {
    const requestsRef = collection(db, 'rooms', roomId, 'joinRequests');
    const q = query(requestsRef, where('status', '==', 'pending'), orderBy('requestedAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const requests: Array<{
      id: string;
      userId: string;
      userName: string;
      status: string;
      requestedAt: Date;
    }> = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        status: data.status,
        requestedAt: data.requestedAt.toDate(),
      });
    });

    return requests;
  } catch (error) {
    console.error('Error getting join requests:', error);
    throw new Error('Failed to get join requests');
  }
};

/**
 * Approve a join request
 */
export const approveJoinRequest = async (
  roomId: string,
  requestId: string,
  userId: string
): Promise<void> => {
  try {
    // Add user to room members
    await addRoomMember(roomId, userId);

    // Update request status
    const requestRef = doc(db, 'rooms', roomId, 'joinRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      approvedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error approving join request:', error);
    throw new Error('Failed to approve join request');
  }
};

/**
 * Reject a join request
 */
export const rejectJoinRequest = async (roomId: string, requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'rooms', roomId, 'joinRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      rejectedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error rejecting join request:', error);
    throw new Error('Failed to reject join request');
  }
};
