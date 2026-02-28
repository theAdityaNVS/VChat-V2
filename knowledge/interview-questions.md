# Interview Questions — VChat-V2 Stack

Questions are organized by technology. Answers are grounded in how this codebase actually implements things.

---

## React

**Q: How is global state managed without Redux?**  
React Context API with three providers: `AuthContext` (user session), `CallContext` (video call state), `ThemeContext` (light/dark). Feature-level state lives in custom hooks (`useMessages`, `useRooms`). Local UI state uses `useState`. The rule is: only elevate to context if the state is needed across unrelated parts of the tree.

**Q: What's the difference between `currentUser` and `userDoc` in AuthContext?**  
`currentUser` is the raw Firebase Auth object (uid, email, emailVerified, token metadata). `userDoc` is a Firestore document with app-specific data (displayName, photoURL, status, bio, lastSeen). `currentUser.uid` is used for ownership checks; `userDoc` is used for anything displayed in the UI.

**Q: How do Firestore subscriptions get cleaned up?**  
Every `onSnapshot` call returns an unsubscribe function. In custom hooks, this is returned as the `useEffect` cleanup: `return () => unsubscribe()`. This fires when the component unmounts or when the dependency (e.g., `roomId`) changes.

**Q: Why are action functions in hooks wrapped with `useCallback`?**  
To keep referential stability — parent components passing these functions as props won't trigger unnecessary re-renders. Also because they close over mutable values (`currentUser`, `roomId`) that need to be in the dependency array.

**Q: How does the RequireAuth route guard work?**  
It reads `loading` and `currentUser` from `AuthContext`. While `loading` is true (auth state not yet resolved from Firebase) it shows a spinner. Once resolved, if `currentUser` is null it redirects to `/login` using React Router's `<Navigate>`. Otherwise it renders children.

**Q: How does the provider nesting order matter?**  
`ThemeProvider → AuthProvider → CallProvider`. `CallProvider` needs auth state (to know which user is in a call), so it must be nested inside `AuthProvider`. `ThemeProvider` has no dependencies so it wraps everything.

**Q: How is the main layout structured with nested routes?**  
`MainLayout` renders a sidebar and an `<Outlet>`. `RequireAuth` wraps `MainLayout` at the route level. Child routes (`/`, `/chat/:roomId`, `/dashboard`, `/calls`) render their page component into the outlet. The `Profile` page is protected but standalone (not inside `MainLayout`) so it renders full-screen.

**Q: How are typing indicators implemented in React?**  
`MessageInput` writes to Firebase RTDB (`rooms/{roomId}/typing/{userId}`) on keydown with a debounce. It also sets a timeout to clear typing after a few seconds of inactivity. `TypingIndicator` subscribes to the RTDB node and renders names of currently typing users. On blur or send, typing status is cleared by setting the RTDB node to `null`.

**Q: What pattern is used for file uploads with progress?**  
`uploadService.uploadFile()` uses Firebase Storage's `uploadBytesResumable` which emits progress events. The component subscribes to these events to show a progress bar and waits for the download URL on completion.

---

## TypeScript

**Q: How is TypeScript strictness enforced?**  
`tsconfig.app.json` enables strict mode. `any` is avoided throughout — ESLint's `@typescript-eslint` rules flag it. All function parameters, return types, and context interfaces are explicitly typed.

**Q: Why are there two parallel type systems for the same data?**  
`src/types/firebase.ts` uses Firestore's `Timestamp` type (needed for Firestore reads/writes). `src/types/message.ts`, `room.ts`, `user.ts`, `call.ts` use JS `Date` (easier to work with in components, compatible with `date-fns`). Service functions are responsible for converting `Timestamp → Date` before returning to hooks.

**Q: How are React Context types structured?**  
Each context has an exported interface (e.g., `AuthContextType`) that explicitly types all state and method signatures. The context is created with `createContext<AuthContextType | null>(null)` and the custom hook (`useAuth`) throws if consumed outside the provider.

**Q: How are union types used for domain modeling?**  
Discriminated unions are used for status fields: `'online' | 'offline' | 'away'`, `'text' | 'image' | 'file' | 'system'` for message type, `'completed' | 'missed' | 'rejected'` for call outcomes. This makes exhaustive switch/conditional logic type-safe.

**Q: How are Firebase types imported to avoid bundle bloat?**  
Using `import type { Timestamp, User as FirebaseUser } from 'firebase/firestore'` — the `import type` form is erased at compile time and never included in the bundle.

**Q: How are form and component props typed?**  
Input components use `React.InputHTMLAttributes<HTMLInputElement>` intersection with custom props. All components define their own `interface Props` or inline type. Forwarded refs use `React.forwardRef<HTMLInputElement, Props>`.

---

## Firebase

**Q: Why use both Firestore and Realtime Database?**  
RTDB is optimized for small, frequently-changing state (presence, typing). It supports `onDisconnect()` natively — automatically running an update if the client disconnects abruptly. Firestore is better for structured, queryable data (messages, rooms, call history) with stronger security rules.

**Q: How does `onDisconnect` work for presence?**  
When a user comes online, `presenceService` immediately registers an `onDisconnect` handler with Firebase RTDB: `onDisconnect(ref).set({ state: 'offline', lastChanged: serverTimestamp() })`. This is stored server-side. If the client disconnects for any reason (browser crash, network drop), Firebase executes this update automatically.

**Q: How are Firestore security rules structured?**  
Rules enforce row-level security: users can only read/write their own documents; room messages are restricted to room members; call signals are restricted to call participants only. Private room documents are unreadable to non-members.

**Q: How is the WebRTC signaling done without a separate backend?**  
Firestore acts as the signaling server. SDP offers, answers, and ICE candidates are written to a `calls/{callId}/signals` subcollection. Both peers subscribe to this subcollection with `onSnapshot`. After the call, the signals are deleted. This avoids needing a WebSocket server.

**Q: How are Firestore timestamps handled?**  
Writes always use `serverTimestamp()` to avoid clock skew between clients. Reads come back as Firestore `Timestamp` objects and are converted to JS `Date` in the service layer before being returned to hooks and components.

**Q: How is file storage security enforced?**  
Firebase Storage rules require authentication. Files are limited to 10MB max. Only MIME types matching images and PDFs are allowed. Files are stored under a path that includes the user's uid, so users can only overwrite their own uploads.

**Q: How are Firestore queries structured for message pagination?**  
Messages are ordered by `createdAt desc` with a `limit()` applied (default 100). This retrieves the most recent N messages. `onSnapshot` keeps the result live so new messages arrive in real time without re-querying.

**Q: How is Google Sign-In implemented?**  
`authService.signInWithGoogle()` uses Firebase's `signInWithPopup(auth, new GoogleAuthProvider())`. After successful auth, it checks if a Firestore user document already exists for that uid; if not, it creates one with the Google profile data.

---

## WebRTC

**Q: Walk through the full call flow.**

1. Caller creates a Firestore call doc (`status: 'ringing'`). 2. Callee detects it via `subscribeToIncomingCalls`. 3. Callee accepts → Firestore updated to `connected`. 4. Both peers subscribe to the signals subcollection. 5. Caller creates `RTCPeerConnection`, gets local media, creates SDP offer, stores in Firestore. 6. Callee reads offer, sets remote description, creates answer, stores back. 7. ICE candidates are exchanged continuously through the same subcollection. 8. Once ICE succeeds, streams flow. 9. Either peer calls `endCall()` → tracks stopped → peer connection closed → `CallLog` created.

**Q: What happens if ICE candidates arrive before the remote description is set?**  
They are queued in an array. Once `setRemoteDescription` completes, the queue is flushed and all queued candidates are added via `addIceCandidate`. This handles the race condition between offer/answer exchange and ICE candidate delivery.

**Q: How does screen sharing work without renegotiation?**  
`getDisplayMedia()` gets the screen track. `RTCRtpSender.replaceTrack()` swaps the existing video track in the peer connection with the screen track. This doesn't require SDP renegotiation, so the call stays connected seamlessly. On stop, the camera track is swapped back.

**Q: What STUN/TURN servers are used?**  
Google's public STUN servers (`stun:stun.l.google.com:19302`). No custom TURN server is configured, so calls may fail on restrictive NAT networks.

**Q: How is the 60-second call timeout implemented?**  
On `initiateCall`, a `setTimeout` is set for 60 seconds. If the call is still in `ringing` status at that point, `rejectCall` is called automatically, updating the Firestore status to `rejected`. The callee's `IncomingCallModal` also shows a local 60-second countdown independently.

---

## Tailwind CSS

**Q: How is dark mode implemented?**  
`ThemeContext` toggles the `dark` class on `document.documentElement`. Tailwind's class-based dark mode strategy (`darkMode: 'class'` in config) then activates all `dark:` variant classes. Theme preference is saved to `localStorage`.

**Q: How is mobile-first responsive design handled?**  
Tailwind's default breakpoints are used (`sm:`, `md:`, `lg:`). Base styles are written for mobile, breakpoint prefixes layer in larger-screen styles. The sidebar collapses on small screens.

**Q: Are there any custom Tailwind tokens?**  
No. The project uses Tailwind's default color palette, spacing, and typography scale. No custom theme extensions are defined in `tailwind.config.ts`.

---

## Vite & Build

**Q: How is the app bundled?**  
`npm run build` runs `tsc -b` first (type checking, no emit), then `vite build` (esbuild-based bundling). TypeScript errors fail the build.

**Q: How are environment variables handled?**  
Vite exposes variables prefixed with `VITE_` via `import.meta.env`. Firebase config is read from these at runtime. Non-`VITE_` vars are not exposed to the client bundle.

**Q: Is code splitting used?**  
Vite performs automatic chunk splitting for dynamic imports. The app doesn't use explicit `React.lazy()` / `Suspense` route splitting, so all pages are bundled together.

---

## Architecture & Design Decisions

**Q: Why no Redux/Zustand for state management?**  
The app's global state needs are small: auth session, active call, and theme. Context API handles these without the boilerplate overhead of an external store. Feature state (messages, rooms) is encapsulated in hooks that are only active when the relevant component is mounted.

**Q: Why is the service layer (src/lib/) kept free of React?**  
Pure functions and Firebase SDK calls are easier to reason about, test in isolation, and reuse. If a service function is needed in multiple hooks, there's no hook-dependency problem. It also makes the data layer portable if the app ever migrates to a different framework.

**Q: What are the trade-offs of using Firestore as a WebRTC signaling server?**  
Pro: no extra server or WebSocket infrastructure needed. Con: slightly higher latency than a dedicated WebSocket signaling server; Firestore write costs add up at scale; cleanup (deleting signal docs) must be done manually.

**Q: How is the app secured against unauthorized access?**  
Three layers: Firebase Auth (must be signed in to call any SDK), Firestore/Storage security rules (server-enforced, prevent unauthorized reads/writes), and `RequireAuth` client-side (redirects unauthenticated users away from protected routes — defense in depth, not a primary security layer).

**Q: How would you add a new feature like message search?**

1. Add a `searchMessages(roomId, query)` function in `src/lib/messageService.ts` (Firestore `where` + full-text search or Algolia integration). 2. Expose it via `useMessages` hook or a new `useMessageSearch` hook. 3. Add a search input component in `src/components/chat/`. 4. Wire it into `ChatRoom.tsx`. No other files need to change.
