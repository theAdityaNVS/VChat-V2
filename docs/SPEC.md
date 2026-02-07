# VChat V2 Technical Specification

## 1. Executive Summary
VChat V2 is a modern, scalable real-time communication platform designed to replace the legacy V1. It leverages React 18, TypeScript, and Firebase to provide professional-grade authentication, rich messaging features, and video calling capabilities. The architecture prioritizes type safety, component reusability, and a mobile-first user experience.

## 2. Technical Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite (ESM, HMR)
- **Styling**: Tailwind CSS
- **State Management**: React Context API + Custom Hooks
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Utilities**: date-fns

### Backend & Services (Firebase)
- **Authentication**: Firebase Auth (Email/Password, Google, GitHub)
- **Database**:
  - **Firestore**: Primary persistent storage (Users, Rooms, Messages, Calls)
  - **Realtime Database (RTDB)**: Low-latency ephemeral data (Presence, Typing Indicators)
- **Storage**: Firebase Storage (Images, File attachments)
- **Hosting**: Vercel (CI/CD)

### Real-time Communication
- **Chat Sync**: Firestore Real-time Listeners (`onSnapshot`)
- **Video/Audio**: LiveKit (SFU architecture) as primary; WebRTC (PeerJS) as fallback/learning.

## 3. Data Architecture

### 3.1 User Model (`users/{userId}`)
```typescript
interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: 'online' | 'away' | 'offline'; // Synced from RTDB
  bio?: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
}
```

### 3.2 Room Model (`rooms/{roomId}`)
```typescript
interface Room {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'voice' | 'video';
  createdBy: string;
  members: string[]; // Array of user UIDs
  isPrivate: boolean;
  createdAt: Timestamp;
}
```

### 3.3 Message Model (`rooms/{roomId}/messages/{messageId}`)
```typescript
interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reactions: Record<string, string[]>; // Map: emoji -> array of userIds
  edited: boolean;
  editedAt?: Timestamp;
  replyTo?: string; // ID of the message being replied to (Threading)
  fileUrl?: string; // For image/file types
  createdAt: Timestamp;
}
```

### 3.4 Call Model (`calls/{callId}`)
```typescript
interface Call {
  id: string;
  roomId: string;
  participants: string[];
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended';
  startedAt: Timestamp;
  endedAt?: Timestamp;
}
```

### 3.5 Ephemeral Data (RTDB)
- **Presence**: `status/{userId}` -> `{ state: 'online', lastChanged: timestamp }`
- **Typing**: `rooms/{roomId}/typing/{userId}` -> `boolean`

## 4. Functional Requirements

### 4.1 Authentication & Identity
- **Login/Signup**: Support for Email/Password and Google Sign-In.
- **Session**: Persistent sessions via Firebase Auth.
- **Profile**: Editable display name, bio, and avatar.
- **Presence**: Automated online/offline status tracking.

### 4.2 Core Messaging
- **Room Management**: Create and list public/private rooms.
- **Real-time Sync**: Instant message delivery via Firestore listeners.
- **Input**: Auto-resizing textarea, emoji picker, file attachment button.
- **Rich Features**:
  - **Reactions**: Hover menu to add emoji reactions.
  - **Threading**: Reply to specific messages with visual context.
  - **Editing**: Edit/Delete own messages (soft delete or flag).
  - **Typing Indicators**: "User is typing..." visual cue (debounced).

### 4.3 Video & Audio
- **1-on-1 Calls**: Integrated video calling with ringing status.
- **Screen Sharing**: Toggleable screen share track.
- **Controls**: Mute audio/video, switch camera, end call.
- **UI**: Responsive video grid (Picture-in-Picture for 1-on-1).

## 5. Security & Performance

### Security Rules
- **Firestore**: Row-level security. Users can only edit/delete their own data. Private rooms accessible only to members.
- **Storage**: Authenticated upload only. Max file size 10MB.

### Performance Targets
- **Build Time**: < 3s (Dev), < 30s (Prod).
- **Bundle Size**: < 200KB (gzipped).
- **Lighthouse**: > 95 score (Performance, Accessibility, Best Practices).
- **PWA**: Offline support via Service Workers and Manifest.