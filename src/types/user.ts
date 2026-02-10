export type UserStatus = 'online' | 'offline' | 'away';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastSeen: Date;
  createdAt: Date;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status?: UserStatus;
  bio?: string;
  createdAt?: Date;
  lastSeen?: Date;
}

export interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}
