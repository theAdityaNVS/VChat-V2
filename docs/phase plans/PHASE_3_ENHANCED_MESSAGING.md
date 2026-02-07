# Phase 3: Enhanced Messaging

**Timeline**: Weeks 5-6
**Focus**: Rich Interactions, Media, and Search

## 1. Message Reactions

### Tasks
- [ ] **Data Model Update**: Add `reactions: Record<string, string[]>` (emoji -> userIds) to Message model.
- [ ] **UI**: Add hover menu to messages with common emojis.
- [ ] **Logic**: Toggle reaction function (add/remove userId from array).
- [ ] **Display**: Show reaction counts below messages.

### Testing Strategy
- **Test**: Clicking an emoji adds it to the list.
- **Test**: Clicking again removes it.
- **Test**: Reaction count aggregates correctly.

---

## 2. Message Editing & Deletion

### Tasks
- [ ] **Permissions**: Only allow author to edit/delete.
- [ ] **UI**: Context menu (3 dots) on message.
- [ ] **Edit Mode**: Transform message text into input field.
- [ ] **Delete Logic**: Soft delete (mark as deleted) or hard delete from Firestore.
- [ ] **Visuals**: Add "(edited)" label to modified messages.

### Testing Strategy
- **Test**: Edit button only visible for own messages.
- **Test**: Submitting edit updates the content and `edited` flag.

---

## 3. Typing Indicators

### Tasks
- [ ] **Realtime DB**: Use RTDB path `rooms/{roomId}/typing/{userId}`.
- [ ] **Logic**:
  - `onKeyDown` -> Set typing true.
  - Debounce (1-2s) -> Set typing false.
- [ ] **UI**: "User is typing..." bubble near input area.

### Testing Strategy
- **Test**: Typing indicator appears when mock data is present.
- **Test**: Debounce logic works (indicator disappears after stop typing).

---

## 4. File & Image Uploads

### Tasks
- [ ] **Storage**: Configure Firebase Storage rules.
- [ ] **UI**: Attachment button in input area.
- [ ] **Preview**: Show image preview before sending.
- [ ] **Upload Logic**:
  - Upload to Storage.
  - Get Download URL.
  - Create Message with type `image` or `file`.
- [ ] **Rendering**: Render `<img>` tag for image type messages.

### Testing Strategy
- **Test**: File selection triggers preview.
- **Test**: Upload progress bar renders.

---

## 5. Threading (Replies)

### Tasks
- [ ] **Data Model**: Add `replyTo` (messageId) field.
- [ ] **UI**: "Reply" action in context menu.
- [ ] **Input**: Show "Replying to..." banner above input.
- [ ] **Rendering**: Render quoted message snippet above the new message.

---

## Phase 3 Deliverables
- ✅ React to messages with emojis.
- ✅ Edit and delete functionality.
- ✅ "User is typing" indicators.
- ✅ Image sharing capability.
- ✅ Reply/Thread support.

## Security Note
- Update **Firestore Security Rules** to ensure:
  - Users can only edit/delete their own messages.
  - Users can only upload files if authenticated.