# Copilot Instructions for VChat-V2

## Commands

```bash
npm run dev          # Start dev server (Vite HMR)
npm run build        # tsc -b && vite build
npm run lint         # ESLint check
npm run format       # Prettier write on src/**/*.{ts,tsx,css,md}
npm run preview      # Preview production build
```

There is no test suite. Pre-commit hooks run `eslint --fix` + `prettier --write` on staged `.ts`/`.tsx` files automatically via Husky + lint-staged.

## Architecture

VChat-V2 is a React 19 + TypeScript + Firebase real-time chat and video-call app. There is no backend server — all data is persisted and synced through Firebase services directly from the client.

### Provider Stack (`App.tsx`)

Providers wrap the app in this order: `ThemeProvider` → `AuthProvider` → `CallProvider`. All three are global and must remain at the top level.

Routes:
| Route | Component | Auth |
|---|---|---|
| `/login` | `Login` | Public |
| `/signup` | `Signup` | Public |
| `/` | `ChatWelcome` (inside `MainLayout`) | Protected |
| `/chat/:roomId` | `ChatRoom` (inside `MainLayout`) | Protected |
| `/dashboard` | `Dashboard` (inside `MainLayout`) | Protected |
| `/profile` | `Profile` | Protected (standalone, no sidebar) |
| `/calls` | `CallHistory` (inside `MainLayout`) | Protected |

`<RequireAuth>` shows a loading spinner while auth resolves, then redirects unauthenticated users to `/login`. It wraps `<MainLayout>` which renders children via `<Outlet>`.

### Firebase Services Split

Two Firebase real-time services serve distinct purposes:

- **Firestore** — persistent data: users, rooms, messages, call history, WebRTC signals
- **Realtime Database (RTDB)** — ephemeral data only: online presence (`users/{uid}/status`) and typing indicators (`rooms/{roomId}/typing/{userId}`)

Firebase is initialized once in `src/config/firebase.ts` which exports `auth`, `db`, `storage`, and `rtdb` with explicit TypeScript types. All service files import from this single config.

### Data Layer (three-layer pattern)

1. **`src/lib/` (service layer)** — Pure Firebase operations, no React. Functions are named exports. Subscription functions always return `() => void` (the unsubscribe callback).

2. **`src/hooks/` (hook layer)** — Wrap services in React state. Each hook exposes `{ data, loading, error, ...actions }`. Subscriptions run in `useEffect` and return the unsubscribe as cleanup. Action functions use `useCallback` with try/catch that writes to `error` state.

3. **`src/components/` + `src/pages/` (UI layer)** — Consume hooks only. **Never import from `src/lib/` directly inside components.**

### Auth: `currentUser` vs `userDoc`

`AuthContext` exposes two user objects with different shapes:

- `currentUser` (`FirebaseUser | null`) — low-level Firebase Auth object (uid, email, emailVerified, metadata)
- `userDoc` (`UserProfile | null`) — enriched Firestore document with app-specific data (displayName, photoURL, status, bio, lastSeen)

Always prefer `userDoc` for display data. Use `currentUser.uid` as the source-of-truth for identity/ownership checks.

### Custom Hooks

| Hook                  | Purpose                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `useAuth`             | Consumes `AuthContext`; primary way to access auth state and methods                  |
| `useMessages(roomId)` | Real-time message subscription + send/edit/delete/react operations                    |
| `useRooms()`          | Real-time room list subscription + `createRoom`                                       |
| `useVideoCall`        | WebRTC peer connection lifecycle, ICE candidates, local/remote streams, call controls |
| `useRecaptcha`        | Executes reCAPTCHA v3 tokens for form bot protection                                  |

### Service Modules (`src/lib/`)

| Service              | Responsibilities                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authService`        | signUp, signIn, signInWithGoogle, logout, updateUserProfile, getUserDocument                                                                                     |
| `messageService`     | sendMessage, subscribeToMessages, editMessage, deleteMessage, toggleReaction                                                                                     |
| `roomService`        | createRoom, subscribeToUserRooms, updateRoom, addRoomMember, deleteRoom, joinRoom, createDirectMessage, requestToJoinRoom, approveJoinRequest, rejectJoinRequest |
| `callService`        | createCall, acceptCall, rejectCall, endCall, subscribeToCall, subscribeToIncomingCalls, sendOffer, sendAnswer, sendIceCandidate, subscribeToSignals              |
| `uploadService`      | uploadFile, isImageFile, getFilePreview, formatFileSize                                                                                                          |
| `presenceService`    | setUserOnline, setUserOffline, updateUserStatus (uses RTDB `onDisconnect`)                                                                                       |
| `userService`        | getUser, getAllUsers, searchUsers, subscribeToUsers, updateUserProfile                                                                                           |
| `callHistoryService` | createCallLog, subscribeToUserCallLogs, subscribeToRoomCallLogs                                                                                                  |
| `typingService`      | setTypingStatus, subscribeToTyping                                                                                                                               |

### WebRTC Video Call Flow

`CallContext` is the orchestrator. `useVideoCall` manages the peer connection.

1. **Initiate**: Caller calls `CallContext.initiateCall()` → creates Firestore doc (`status: 'ringing'`) → auto-rejects after 60s if unanswered.
2. **Receive**: `subscribeToIncomingCalls()` detects `calleeId == currentUser.uid && status == 'ringing'` → shows `IncomingCallModal` with 60s countdown.
3. **Accept**: `CallContext.acceptCall()` → updates Firestore `status: 'connected'` + `startedAt` → triggers WebRTC initialization in `useVideoCall`.
4. **Signaling**: Both peers subscribe to `subscribeToSignals(callId, userId)`. Caller creates offer via `createOffer()` → stores in Firestore `calls/{callId}/signals` subcollection → callee receives, creates answer, sends back → ICE candidates exchanged continuously via the same subcollection.
5. **ICE queueing**: Candidates received before remote description is set are queued and applied once `setRemoteDescription` completes.
6. **Media**: Audio uses echo cancellation; video targets 1280×720. Screen sharing swaps the video track via `replaceTrack()`.
7. **Teardown**: `endCall()` updates Firestore status → stops all local tracks → closes `RTCPeerConnection` → `CallContext` detects `status: 'ended'` → creates `CallLog` with outcome + duration → signals subcollection deleted after 5s delay.

## Data Models

### `UserProfile` (`src/types/user.ts`)

```ts
id: string; email: string; displayName: string;
avatarUrl?: string; bio?: string;
status: 'online' | 'offline' | 'away';
lastSeen: Date; createdAt: Date;
```

### `Room` (`src/types/room.ts`)

```ts
id: string; name: string; type: 'public' | 'private' | 'direct';
members: string[]; createdBy: string; createdAt: Date;
description?: string; avatarUrl?: string;
lastMessage?: string; lastMessageAt?: Date;
```

### `Message` (`src/types/message.ts`)

```ts
id: string; roomId: string; senderId: string; senderName: string;
senderAvatar?: string; content: string;
type: 'text' | 'image' | 'file' | 'system';
createdAt: Date; updatedAt?: Date;
reactions?: { emoji: string; userId: string; userName: string }[];
replyTo?: string; isEdited?: boolean; isDeleted?: boolean;
```

### `Call` / `CallLog` (`src/types/call.ts`)

```ts
// Call (active)
status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';
mediaType: 'audio' | 'video'; type: '1-on-1' | 'group';
callerId, callerName, callerAvatar?, calleeId, calleeName, calleeAvatar?

// CallLog (history)
direction: 'incoming' | 'outgoing';
outcome: 'completed' | 'missed' | 'rejected' | 'no-answer' | 'cancelled';
duration?: number; // seconds
```

## UI Components (`src/components/ui/`)

| Component         | Key Props                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `Button`          | `variant` (primary/secondary/danger), `size` (sm/md/lg), `fullWidth`, `isLoading` |
| `Input`           | Standard HTML attrs + `label`, `error`, `helperText`, `icon` (LucideIcon)         |
| `Card`            | `children`, `className`                                                           |
| `Alert`           | `message`, `type` (error/success/warning/info)                                    |
| `StatusIndicator` | `status` (online/offline/away), `size` (sm/md/lg), `showText`                     |

All interactive components use `forwardRef`.

## Key Conventions

### TypeScript

- Strict interfaces for all data — never `any`
- Firebase SDK types imported as `import type { Timestamp } from 'firebase/firestore'`
- Context values must have an exported interface (e.g., `AuthContextType`)
- Two parallel type systems exist: `src/types/firebase.ts` (Firestore `Timestamp`-based, used in service layer) and `src/types/*.ts` (JS `Date`-based, used in hooks/components). Services convert `Timestamp → Date` when returning data to hooks.

### Components

- Functional components with hooks only — no class components
- Feature components: `src/components/{feature}/` (`chat/`, `video/`, `auth/`)
- Base UI primitives: `src/components/ui/`
- Reusable stateful logic: `src/hooks/`
- Never import from `src/lib/` inside a component

### Styling

- Tailwind CSS utility classes only — no custom CSS except `src/index.css` for globals
- Mobile-first responsive design
- Dark mode via `ThemeContext`; use Tailwind `dark:` variants

### Firebase Operations

- All Firestore writes use `serverTimestamp()` for `createdAt`/`updatedAt`
- Message `reactions` field shape: `Record<string, string[]>` (emoji → array of userIds) in Firestore; `MessageReaction[]` after transformation in hooks
- File uploads via `uploadService`; max 10MB, images + PDFs only
- Presence uses RTDB `onDisconnect` so status clears even on abrupt disconnects
- Typing indicators: RTDB at `rooms/{roomId}/typing/{userId}` with `{ userName, timestamp }`; clear by setting node to `null`

### Commit Messages

Conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`

### Environment Variables

All Firebase config uses `VITE_FIREBASE_` prefix in `.env`. Never hardcode credentials.
