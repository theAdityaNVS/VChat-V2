# VChat-V2 — Project Knowledge

## What the App Does

VChat-V2 is a full-featured real-time communication platform built with React 19 + TypeScript + Firebase. It supports text-based chat rooms (public, private, direct messages), WebRTC peer-to-peer video/audio calls, file sharing, message reactions/editing/replies, user presence/typing indicators, and a call history log.

---

## Tech Stack

| Layer              | Technology                                                |
| ------------------ | --------------------------------------------------------- |
| Frontend Framework | React 19.2 + TypeScript 5.9                               |
| Build Tool         | Vite 7.2                                                  |
| Styling            | Tailwind CSS 4.1 (class-based dark mode)                  |
| Routing            | React Router DOM 7.13                                     |
| Backend / DB       | Firebase 12.9 (Auth, Firestore, RTDB, Storage, Analytics) |
| Real-time Calls    | WebRTC (peer-to-peer)                                     |
| Icons              | Lucide React                                              |
| Date Utils         | date-fns                                                  |
| Linting            | ESLint 9 + typescript-eslint                              |
| Formatting         | Prettier 3.8                                              |
| Pre-commit         | Husky 9 + lint-staged                                     |

---

## Project Structure

```
src/
├── config/         Firebase initialization (auth, db, storage, rtdb exports)
├── context/        AuthContext, CallContext, ThemeContext
├── components/
│   ├── ui/         Button, Input, Card, Alert, StatusIndicator
│   ├── chat/       MessageList, MessageInput, Message, RoomList, RoomSettings,
│   │               CreateRoomModal, UserBrowser, TypingIndicator, CallLogItem
│   ├── video/      VideoCallModal, CallControls, IncomingCallModal
│   ├── auth/       RequireAuth (route guard)
│   └── layouts/    MainLayout (sidebar + outlet), AuthLayout
├── pages/          Login, Signup, ChatRoom, Dashboard, Profile, CallHistory
├── hooks/          useAuth, useMessages, useRooms, useVideoCall, useRecaptcha
├── lib/            Service layer (9 modules — one per domain)
├── types/          user.ts, room.ts, message.ts, call.ts, firebase.ts
├── App.tsx         Router + provider tree setup
└── main.tsx        Entry point
```

---

## Firebase Architecture

### Which Service Does What

| Firebase Service      | Used For                                                          |
| --------------------- | ----------------------------------------------------------------- |
| **Auth**              | Email/password + Google OAuth, session persistence                |
| **Firestore**         | Users, rooms, messages, call history, WebRTC signals (persistent) |
| **Realtime Database** | Online presence, typing indicators (ephemeral)                    |
| **Storage**           | Image and file uploads (max 10MB, images + PDFs only)             |

### Why Two Real-Time Services

Firestore is great for structured, queryable data but has higher latency for tiny ephemeral updates. RTDB is designed for low-latency state like "is this user online right now" and supports `onDisconnect()` natively — which automatically sets a user offline if their connection drops without a clean logout.

### Firebase Initialization

Single file: `src/config/firebase.ts`. Exports:

```ts
export const auth: Auth;
export const db: Firestore;
export const storage: FirebaseStorage;
export const rtdb: Database;
```

All `VITE_FIREBASE_*` env vars are read here. All service files import from this one config.

---

## State Management

No Redux or Zustand. State lives in three places:

1. **React Context** (global) — `AuthContext`, `CallContext`, `ThemeContext`
2. **Custom hooks** (feature-scoped) — `useMessages`, `useRooms`, `useVideoCall`
3. **Local component state** — UI-only state (open/close modals, input values)

### Context Responsibilities

**`AuthContext`**

- `currentUser` (FirebaseUser) — raw Firebase Auth user
- `userDoc` (UserProfile) — Firestore enriched user with displayName, photoURL, status, bio
- Methods: `signUp`, `signIn`, `signInWithGoogle`, `logout`, `updateUserProfile`
- Rule: always use `currentUser.uid` for identity, use `userDoc` for display data

**`CallContext`**

- Tracks `activeCallId`, `currentCall`, `incomingCalls[]`
- Methods: `initiateCall`, `acceptCall`, `rejectCall`, `endCall`
- Global because the incoming call overlay must be visible from any page

**`ThemeContext`**

- `theme: 'light' | 'dark'`
- Persists to `localStorage`; detects system preference on first load
- Applies by toggling the `dark` class on `document.documentElement`
- Methods: `toggleTheme()`, `setTheme(theme)`

---

## Data Layer Pattern

Three-layer architecture with strict boundaries:

```
src/lib/   ← Pure Firebase. No React. Returns data and () => void unsubscribers.
    ↓
src/hooks/ ← Wraps lib in useState/useEffect. Exposes { data, loading, error, ...actions }.
    ↓
src/components/ + src/pages/ ← Consumes hooks only. Never imports from src/lib/ directly.
```

### Service Pattern Example

```ts
// lib/messageService.ts
export const subscribeToMessages = (
  roomId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const unsubscribe = onSnapshot(query(...), (snap) => {
    callback(transformedMessages);
  });
  return unsubscribe; // always returned
};
```

### Hook Pattern Example

```ts
// hooks/useMessages.ts
export const useMessages = (roomId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToMessages(roomId, setMessages);
    return () => unsub(); // cleanup
  }, [roomId]);

  const sendMessage = useCallback(async (data: SendMessageData) => {
    try {
      await sendMessageService(...);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      return false;
    }
  }, [currentUser, roomId]);

  return { messages, loading, error, sendMessage };
};
```

---

## Routing

```
/login              Login            (public, AuthLayout)
/signup             Signup           (public, AuthLayout)
/                   ChatWelcome      (protected, inside MainLayout)
/chat/:roomId       ChatRoom         (protected, inside MainLayout)
/dashboard          Dashboard        (protected, inside MainLayout)
/profile            Profile          (protected, standalone)
/calls              CallHistory      (protected, inside MainLayout)
*                   → redirect to /
```

`RequireAuth` wraps `MainLayout`. On load it shows a spinner, then redirects to `/login` if unauthenticated.

---

## Data Models

### UserProfile (`src/types/user.ts`)

```ts
id: string
email: string
displayName: string
avatarUrl?: string
bio?: string
status: 'online' | 'offline' | 'away'
lastSeen: Date
createdAt: Date
```

### Room (`src/types/room.ts`)

```ts
id: string
name: string
type: 'public' | 'private' | 'direct'
members: string[]         // array of uids
createdBy: string         // uid
createdAt: Date
description?: string
avatarUrl?: string
lastMessage?: string
lastMessageAt?: Date
```

### Message (`src/types/message.ts`)

```ts
id: string
roomId: string
senderId: string
senderName: string
senderAvatar?: string
content: string
type: 'text' | 'image' | 'file' | 'system'
createdAt: Date
updatedAt?: Date
reactions?: { emoji: string; userId: string; userName: string }[]
replyTo?: string          // id of replied-to message
isEdited?: boolean
isDeleted?: boolean
```

### Call / CallLog (`src/types/call.ts`)

```ts
// Active call
status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected'
mediaType: 'audio' | 'video'
type: '1-on-1' | 'group'
callerId, callerName, callerAvatar?, calleeId, calleeName, calleeAvatar?

// CallLog (persisted history)
direction: 'incoming' | 'outgoing'
outcome: 'completed' | 'missed' | 'rejected' | 'no-answer' | 'cancelled'
duration?: number   // in seconds
timestamp: Date
```

### Type System Note

Two parallel type systems exist:

- `src/types/firebase.ts` — uses Firestore `Timestamp`, used inside service layer
- `src/types/*.ts` — uses JS `Date`, used in hooks and components

Service functions convert `Timestamp → Date` before returning data to hooks.

---

## WebRTC Video Call Flow

### Step-by-Step

1. **Initiate** — `CallContext.initiateCall()` creates a Firestore doc (`status: 'ringing'`). Auto-rejects after 60 seconds.
2. **Receive** — `subscribeToIncomingCalls()` detects `calleeId == uid && status == 'ringing'`. `IncomingCallModal` shows a 60s countdown.
3. **Accept** — `CallContext.acceptCall()` sets Firestore `status: 'connected'` + `startedAt`. Triggers WebRTC init in `useVideoCall`.
4. **Offer** — Caller gets local media (`getUserMedia`), creates `RTCPeerConnection` with Google STUN servers, creates SDP offer, stores it in Firestore `calls/{callId}/signals`.
5. **Answer** — Callee receives offer via `subscribeToSignals`, sets remote description, creates SDP answer, sends it back.
6. **ICE Exchange** — Both peers emit ICE candidates via `onicecandidate`. Candidates received before `setRemoteDescription` is complete are queued and applied after.
7. **Streams flow** — Once ICE negotiation succeeds, `VideoCallModal` attaches local stream (muted, picture-in-picture) and remote stream (main video).
8. **Teardown** — `endCall()` sets Firestore `status: 'ended'`, stops all tracks, closes `RTCPeerConnection`. `CallContext` creates a `CallLog` with outcome + duration. Signals subcollection deleted after 5s.

### Media Constraints

- Audio: echo cancellation enabled
- Video: 1280×720 target resolution
- Screen share: swaps video track via `replaceTrack()` (no renegotiation)

---

## Presence System

`presenceService.ts` uses a dual-write pattern:

- **RTDB** (`users/{uid}`) — low-latency real-time status for other users to observe
- **Firestore** (`users/{uid}`) — persistent `lastSeen` timestamp

The critical detail: `onDisconnect()` is registered on RTDB immediately after going online. This ensures status is set to `'offline'` even if the browser tab crashes or loses connectivity without a clean logout.

Tab switching triggers `'away'` status via the `document.visibilitychange` event.

---

## Firestore Security Rules Summary

- **users/{userId}**: Public read, self-write only
- **rooms/{roomId}**:
  - Public rooms: authenticated read
  - Private rooms: members only
  - Create: authenticated + must include self as member
  - Delete: room creator only
- **rooms/{roomId}/messages**: Room members only (read + write)
- **rooms/{roomId}/joinRequests**: Members read; creator approves/rejects
- **calls/{callId}**: Caller and callee only
- **calls/{callId}/signals**: Participant read/write; auto-cleaned after call
- **callLogs/{id}**: Participants read/write; immutable after creation

---

## Chat Room Features (what ChatRoom.tsx wires together)

- Full message CRUD via `useMessages(roomId)`
- Real-time typing indicators via `subscribeToTyping`
- File drag-and-drop with upload progress (via `uploadService`)
- Message reply (stores `replyTo: messageId`, rendered with quoted context)
- Message reactions (emoji picker, toggled by userId)
- Video/audio call initiation via `CallContext`
- Room auto-join for public rooms on first access
- Room settings modal for admins (rename, manage members, delete)
- Private room access gate (blocks non-members with join request)

---

## UI Component Conventions

All interactive components use `forwardRef`. All accept `className` for extension.

| Component         | Key Props                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `Button`          | `variant` (primary/secondary/danger), `size` (sm/md/lg), `isLoading`, `fullWidth` |
| `Input`           | standard HTML attrs + `label`, `error`, `helperText`, `icon` (LucideIcon)         |
| `Card`            | `children`, `className`                                                           |
| `Alert`           | `message`, `type` (error/success/warning/info)                                    |
| `StatusIndicator` | `status` (online/offline/away), `size`, `showText`                                |

---

## Environment Variables

All required, prefixed with `VITE_FIREBASE_`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID        (optional, Analytics)
VITE_FIREBASE_DATABASE_URL          (required for RTDB)
```
