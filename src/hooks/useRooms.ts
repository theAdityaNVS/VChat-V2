import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToUserRooms, createRoom as createRoomService } from '../lib/roomService';
import type { Room, CreateRoomData } from '../types/room';

export const useRooms = () => {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(!!currentUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const unsubscribe = subscribeToUserRooms(currentUser.uid, (updatedRooms) => {
      setRooms(updatedRooms);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const createRoom = async (roomData: CreateRoomData): Promise<string | null> => {
    if (!currentUser) {
      setError('Must be logged in to create a room');
      return null;
    }

    try {
      setError(null);
      const roomId = await createRoomService(roomData, currentUser.uid);
      return roomId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setError(message);
      return null;
    }
  };

  return {
    rooms,
    loading,
    error,
    createRoom,
  };
};
