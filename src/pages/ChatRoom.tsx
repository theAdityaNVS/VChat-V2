import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMessages } from '../hooks/useMessages';
import { useRooms } from '../hooks/useRooms';
import { setTypingStatus, subscribeToTyping, type TypingUser } from '../lib/typingService';
import { uploadFile, isImageFile, type UploadProgress } from '../lib/uploadService';
import type { Message } from '../types/message';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import RoomSettings from '../components/chat/RoomSettings';

const ChatRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentUser, userDoc } = useAuth();
  const { messages, loading, sendMessage, toggleReaction, editMessage, deleteMessage } =
    useMessages(roomId);
  const { rooms } = useRooms();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Find the current room
  const currentRoom = rooms.find((room) => room.id === roomId);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const unsubscribe = subscribeToTyping(roomId, currentUser.uid, (users) => {
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, [roomId, currentUser]);

  const handleSendMessage = async (content: string): Promise<boolean> => {
    const success = await sendMessage({
      content,
      replyTo: replyingTo?.id,
    });

    if (success) {
      setReplyingTo(null);
    }

    return success;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setReplyingTo(message);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleEdit = (messageId: string) => {
    // TODO: Show edit UI - for now just use prompt
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      const newContent = prompt('Edit message:', message.content);
      if (newContent && newContent.trim() && newContent !== message.content) {
        editMessage(messageId, newContent.trim());
      }
    }
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!roomId || !currentUser || !userDoc) return;

    const userName = userDoc.displayName || currentUser.email || 'Anonymous';
    setTypingStatus(roomId, currentUser.uid, userName, isTyping);
  };

  const handleSendFile = async (file: File): Promise<boolean> => {
    if (!roomId) return false;

    try {
      // Upload file and get download URL
      const downloadURL = await uploadFile(file, roomId, (progress: UploadProgress) => {
        console.log('Upload progress:', progress);
        // TODO: Show upload progress in UI
      });

      // Send message with the file URL
      const messageType = isImageFile(file) ? 'image' : 'file';
      return await sendMessage({
        content: downloadURL,
        type: messageType,
      });
    } catch (error) {
      console.error('Error sending file:', error);
      return false;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Room Header */}
      <div className="flex h-16 items-center justify-between border-b px-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {currentRoom?.name || `Room #${roomId}`}
          </h2>
          <p className="text-xs text-gray-500">
            {currentRoom?.members.length || 0} member(s)
            {currentRoom?.description && ` • ${currentRoom.description}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Room settings"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <MessageList
        messages={messages}
        loading={loading}
        onReaction={handleReaction}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReply={handleReply}
      />

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onTyping={handleTyping}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Room Settings Modal */}
      {currentRoom && (
        <RoomSettings
          room={currentRoom}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatRoom;
