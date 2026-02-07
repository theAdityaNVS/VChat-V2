# Phase 2: Core Chat Features

**Timeline**: Weeks 3-4
**Focus**: Real-time Messaging, Rooms, and Presence

## 1. Application Layout

### Tasks
- [ ] **Main Layout**: Create the dashboard shell.
  - Sidebar (Left): Navigation and Room List.
  - Chat Area (Center/Right): Messages and Input.
- [ ] **Responsive**: Ensure Sidebar becomes a drawer on mobile.

---

## 2. Room Management

### Tasks
- [ ] **Data Model**: Define `Room` interface (id, name, type, members).
- [ ] **Sidebar Component**: Fetch and display list of rooms from Firestore.
- [ ] **Create Room**: Modal to create new rooms (Public/Private).
- [ ] **Room Switching**: Routing logic `/chat/:roomId`.

### Testing Strategy
- **Test**: Sidebar renders list of rooms.
- **Test**: Clicking a room navigates to the correct URL.

---

## 3. Message List & Real-time Sync

### Tasks
- [ ] **Data Model**: Define `Message` interface.
- [ ] **Firestore Hooks**: Create `useMessages(roomId)` hook.
  - Subscribe to `messages` subcollection (or query).
  - Order by `createdAt`.
- [ ] **Message Component**:
  - Display avatar, name, timestamp, and content.
  - Distinguish "My Messages" (right aligned) vs "Others" (left aligned).
- [ ] **Virtualization**: (Optional) Implement windowing if expecting large lists, otherwise standard scroll.
- [ ] **Auto-scroll**: Scroll to bottom on new message.

### Testing Strategy
- **Test**: Message list updates when new data arrives (mock Firestore).
- **Test**: Messages are styled correctly based on sender (me vs them).

---

## 4. Message Input

### Tasks
- [ ] **Input Component**: Textarea with auto-resize.
- [ ] **Sending Logic**:
  - `sendMessage` function writing to Firestore.
  - Optimistic UI updates (optional but recommended).
- [ ] **Emoji Picker**: Integrate a lightweight emoji picker library.

### Testing Strategy
- **Test**: Typing updates local state.
- **Test**: Pressing Enter sends message and clears input.
- **Test**: Empty messages cannot be sent.

---

## 5. User Presence & Profiles

### Tasks
- [ ] **Presence System**:
  - Use Firebase Realtime Database (RTDB) for `online/offline` status (better latency than Firestore).
  - Sync RTDB presence to Firestore user profile `lastSeen`.
- [ ] **User Profile**:
  - Settings page to update Display Name, Bio, and Avatar.
  - Avatar component with status dot (Green/Gray).

### Testing Strategy
- **Test**: Status indicator changes color based on prop.
- **Test**: Profile form updates user context.

---

## Phase 2 Deliverables
- ✅ Sidebar with dynamic room list.
- ✅ Real-time sending and receiving of text messages.
- ✅ Auto-scrolling chat window.
- ✅ User online/offline status indicators.
- ✅ Basic user profile management.

## Technical Notes
- **Database Structure**:
  ```
  rooms/{roomId}
  rooms/{roomId}/messages/{messageId}
  users/{userId}
  ```
- **Indexes**: Ensure Firestore composite indexes are created for `messages` query (roomId + createdAt).