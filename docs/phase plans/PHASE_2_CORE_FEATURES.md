# Phase 2: Core Chat Features

**Timeline**: Weeks 3-4
**Focus**: Real-time Messaging, Rooms, and Presence

## 1. Application Layout

### Tasks

- [x] **Main Layout**: Create the dashboard shell.
  - Sidebar (Left): Navigation and Room List.
  - Chat Area (Center/Right): Messages and Input.
- [x] **Responsive**: Ensure Sidebar becomes a drawer on mobile.

---

## 2. Room Management

### Tasks

- [x] **Data Model**: Define `Room` interface (id, name, type, members).
- [x] **Sidebar Component**: Fetch and display list of rooms from Firestore.
- [x] **Create Room**: Modal to create new rooms (Public/Private).
- [x] **Room Switching**: Routing logic `/chat/:roomId`.

### Testing Strategy

- **Test**: Sidebar renders list of rooms.
- **Test**: Clicking a room navigates to the correct URL.

---

## 3. Message List & Real-time Sync

### Tasks

- [x] **Data Model**: Define `Message` interface.
- [x] **Firestore Hooks**: Create `useMessages(roomId)` hook.
  - Subscribe to `messages` subcollection (or query).
  - Order by `createdAt`.
- [x] **Message Component**:
  - Display avatar, name, timestamp, and content.
  - Distinguish "My Messages" (right aligned) vs "Others" (left aligned).
- [x] **Virtualization**: (Optional) Implement windowing if expecting large lists, otherwise standard scroll.
- [x] **Auto-scroll**: Scroll to bottom on new message.

### Testing Strategy

- **Test**: Message list updates when new data arrives (mock Firestore).
- **Test**: Messages are styled correctly based on sender (me vs them).

---

## 4. Message Input

### Tasks

- [x] **Input Component**: Textarea with auto-resize.
- [x] **Sending Logic**:
  - `sendMessage` function writing to Firestore.
  - Optimistic UI updates (optional but recommended).
- [x] **Emoji Picker**: Integrate a lightweight emoji picker library.

### Testing Strategy

- **Test**: Typing updates local state.
- **Test**: Pressing Enter sends message and clears input.
- **Test**: Empty messages cannot be sent.

---

## 5. User Presence & Profiles

### Tasks

- [x] **Presence System**:
  - Use Firebase Realtime Database (RTDB) for `online/offline` status (better latency than Firestore).
  - Sync RTDB presence to Firestore user profile `lastSeen`.
- [x] **User Profile**:
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

---

## Technical Notes

**Database Structure**:

```
rooms/{roomId}
rooms/{roomId}/messages/{messageId}
users/{userId}
```

**Indexes**: Ensure Firestore composite indexes are created for `messages` query (roomId + createdAt).

---

## Conclusion

Phase 2 implemented core real-time chat functionality:

✅ **Real-time messaging** with Firestore synchronization  
✅ **Room management** with public and private rooms  
✅ **User presence system** showing online/offline status  
✅ **Responsive layout** working across desktop and mobile  
✅ **Profile management** for user customization

**Status**: Phase 2 **COMPLETE** ✓  
**Next**: [Phase 3 - Enhanced Messaging](./PHASE_3_ENHANCED_MESSAGING.md)
