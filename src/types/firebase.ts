/**
 * Firebase Configuration Types
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firestore Document Models
 */

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: 'online' | 'away' | 'offline';
  bio?: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastSeen: FirebaseFirestore.Timestamp;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'voice' | 'video';
  createdBy: string;
  members: string[];
  isPrivate: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reactions: Record<string, string[]>;
  edited: boolean;
  editedAt?: FirebaseFirestore.Timestamp;
  replyTo?: string;
  fileUrl?: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Call {
  id: string;
  roomId: string;
  participants: string[];
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended';
  startedAt: FirebaseFirestore.Timestamp;
  endedAt?: FirebaseFirestore.Timestamp;
}
