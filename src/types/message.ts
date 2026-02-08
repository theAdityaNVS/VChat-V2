export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  createdAt: Date;
  updatedAt?: Date;
  reactions?: MessageReaction[];
  replyTo?: string; // Message ID being replied to
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface SendMessageData {
  content: string;
  type?: MessageType;
  replyTo?: string;
}
