import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMessages } from '../hooks/useMessages';
import { useRooms } from '../hooks/useRooms';
import { useCall } from '../context/CallContext';
import { setTypingStatus, subscribeToTyping, type TypingUser } from '../lib/typingService';
import { uploadFile, isImageFile, type UploadProgress } from '../lib/uploadService';
import { joinRoom } from '../lib/roomService';
import { getUser } from '../lib/userService';
import { subscribeToRoomCallLogs } from '../lib/callHistoryService';
import type { Message } from '../types/message';
import type { UserDoc } from '../types/user';
import type { CallLog } from '../types/call';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import RoomSettings from '../components/chat/RoomSettings';
import VideoCallModal from '../components/video/VideoCallModal';

const ChatRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentUser, userDoc } = useAuth();
  const { rooms } = useRooms();
  const { initiateCall, currentCall } = useCall();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningError, setJoiningError] = useState<string | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [otherUser, setOtherUser] = useState<UserDoc | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Find the current room
  const currentRoom = rooms.find((room) => room.id === roomId);

  // Check if user is a member of the room
  const isMember =
    currentRoom && currentUser ? currentRoom.members.includes(currentUser.uid) : false;

  // Determine the effective roomId to pass to useMessages
  // Only pass roomId if user is a member, otherwise pass undefined to prevent subscription
  const effectiveRoomId = isMember ? roomId : undefined;

  const { messages, loading, sendMessage, toggleReaction, editMessage, deleteMessage } =
    useMessages(effectiveRoomId);

  // Subscribe to call logs for this room
  useEffect(() => {
    if (!roomId || !currentUser || !isMember) return;

    const unsubscribe = subscribeToRoomCallLogs(
      roomId,
      (logs) => {
        setCallLogs(logs);
      },
      currentUser.uid
    );

    return () => unsubscribe();
  }, [roomId, currentUser, isMember]);

  // Auto-join public rooms
  useEffect(() => {
    const autoJoinPublicRoom = async () => {
      if (!roomId || !currentUser || !currentRoom) return;

      // If user is already a member, do nothing
      if (isMember) return;

      // If it's a public room and user is not a member, join automatically
      if (currentRoom.type === 'public') {
        setIsJoining(true);
        setJoiningError(null);
        try {
          await joinRoom(roomId, currentUser.uid);
          // The rooms subscription will automatically update and set isMember to true
        } catch (error) {
          console.error('Error auto-joining public room:', error);
          setJoiningError(error instanceof Error ? error.message : 'Failed to join room');
        } finally {
          setIsJoining(false);
        }
      }
    };

    autoJoinPublicRoom();
  }, [roomId, currentUser, currentRoom, isMember]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!roomId || !currentUser) return;

    const unsubscribe = subscribeToTyping(roomId, currentUser.uid, (users) => {
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, [roomId, currentUser]);

  // Fetch other user for 1-on-1 video calls
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!currentRoom || !currentUser || currentRoom.type !== 'direct') return;

      // Find the other user in the room
      const otherUserId = currentRoom.members.find((id) => id !== currentUser.uid);
      if (otherUserId) {
        try {
          const user = await getUser(otherUserId);
          setOtherUser(user);
        } catch (error) {
          console.error('Error fetching other user:', error);
        }
      }
    };

    fetchOtherUser();
  }, [currentRoom, currentUser]);

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

  const handleInitiateVideoCall = async () => {
    if (!roomId || !otherUser || isInitiatingCall) {
      console.error('Cannot initiate call: missing room or user info, or already initiating');
      return;
    }

    try {
      setIsInitiatingCall(true);
      await initiateCall({
        roomId,
        calleeId: otherUser.uid,
        calleeName: otherUser.displayName,
        calleeAvatar: otherUser.photoURL,
        mediaType: 'video',
      });
      setShowVideoCall(true);
    } catch (error) {
      console.error('Failed to initiate video call:', error);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleInitiateAudioCall = async () => {
    if (!roomId || !otherUser || isInitiatingCall) {
      console.error('Cannot initiate call: missing room or user info, or already initiating');
      return;
    }

    try {
      setIsInitiatingCall(true);
      await initiateCall({
        roomId,
        calleeId: otherUser.uid,
        calleeName: otherUser.displayName,
        calleeAvatar: otherUser.photoURL,
        mediaType: 'audio',
      });
      setShowVideoCall(true);
    } catch (error) {
      console.error('Failed to initiate audio call:', error);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // Show video call modal when there's an active call
  useEffect(() => {
    if (currentCall && (currentCall.status === 'ringing' || currentCall.status === 'connected')) {
      console.log('Opening video call modal for status:', currentCall.status);
      setShowVideoCall(true);
    } else if (
      currentCall &&
      (currentCall.status === 'ended' || currentCall.status === 'rejected')
    ) {
      console.log('Closing video call modal for status:', currentCall.status);
      setShowVideoCall(false);
    }
  }, [currentCall]);

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

  const handleSendFile = async (
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<boolean> => {
    if (!roomId) return false;

    try {
      // Upload file and get download URL
      const downloadURL = await uploadFile(file, roomId, onProgress);

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
          {/* Audio & Video Call Buttons (only for direct/1-on-1 rooms) */}
          {currentRoom?.type === 'direct' && otherUser && (
            <>
              <button
                onClick={handleInitiateAudioCall}
                disabled={isInitiatingCall || !!currentCall}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start voice call"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
              <button
                onClick={handleInitiateVideoCall}
                disabled={isInitiatingCall || !!currentCall}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start video call"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </>
          )}
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

      {/* Joining Room State */}
      {isJoining && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Joining room...</p>
          </div>
        </div>
      )}

      {/* Joining Error State */}
      {!isJoining && joiningError && (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <p className="text-red-600">{joiningError}</p>
          </div>
        </div>
      )}

      {/* Not a Member State (for private rooms) */}
      {!isJoining && !joiningError && !isMember && currentRoom && currentRoom.type !== 'public' && (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-lg bg-yellow-50 p-6 text-center">
            <p className="text-yellow-800">You are not a member of this room.</p>
            <p className="mt-2 text-sm text-yellow-600">
              Request access from the room admin to join.
            </p>
          </div>
        </div>
      )}

      {/* Messages Area - Only show when user is a member */}
      {!isJoining && !joiningError && isMember && (
        <>
          <MessageList
            messages={messages}
            callLogs={callLogs}
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
        </>
      )}

      {/* Room Settings Modal */}
      {currentRoom && (
        <RoomSettings
          room={currentRoom}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Video Call Modal */}
      {showVideoCall && currentCall && currentUser && (
        <VideoCallModal
          callId={currentCall.id}
          isInitiator={currentCall.callerId === currentUser.uid}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </div>
  );
};

export default ChatRoom;
