export type RoomType = 'public' | 'private' | 'direct';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  members: string[]; // Array of user IDs
  createdAt: Date;
  createdBy: string;
  description?: string;
  avatarUrl?: string;
  lastMessageAt?: Date;
  lastMessage?: string;
}

export interface CreateRoomData {
  name: string;
  type: RoomType;
  members?: string[];
  description?: string;
}
