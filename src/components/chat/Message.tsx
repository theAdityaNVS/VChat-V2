import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { Message as MessageType } from '../../types/message';

interface MessageProps {
  message: MessageType;
  isOwnMessage: boolean;
  currentUserId: string;
  currentUserName: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  replyToMessage?: MessageType | null;
}

const Message = ({
  message,
  isOwnMessage,
  currentUserId,
  onReaction,
  onEdit,
  onDelete,
  onReply,
  replyToMessage,
}: MessageProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const formattedTime = formatDistanceToNow(message.createdAt, { addSuffix: true });

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleReactionClick = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactionPicker(false);
  };

  // Aggregate reactions by emoji
  const aggregatedReactions = message.reactions?.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          count: 0,
          userIds: [],
          userNames: [],
        };
      }
      acc[reaction.emoji].count += 1;
      acc[reaction.emoji].userIds.push(reaction.userId);
      acc[reaction.emoji].userNames.push(reaction.userName);
      return acc;
    },
    {} as Record<string, { count: number; userIds: string[]; userNames: string[] }>
  );

  const hasUserReacted = (emoji: string) => {
    return aggregatedReactions?.[emoji]?.userIds.includes(currentUserId) || false;
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-600">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
          {message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            message.senderName[0].toUpperCase()
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700">{message.senderName}</span>
            <span className="text-xs text-gray-500">{formattedTime}</span>
          </div>
        )}

        <div className="relative">
          {/* Replied message preview */}
          {message.replyTo && replyToMessage && (
            <div className="mb-2 pl-3 border-l-2 border-gray-300 bg-gray-50 p-2 rounded text-xs">
              <div className="font-semibold text-gray-700">{replyToMessage.senderName}</div>
              <div className="text-gray-600 truncate">
                {replyToMessage.type === 'image' ? '📷 Image' : replyToMessage.content}
              </div>
            </div>
          )}

          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-blue-600 text-white'
                : message.isDeleted
                  ? 'bg-gray-100 text-gray-400 italic'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.type === 'image' ? (
              <div className="flex flex-col gap-2">
                <img
                  src={message.content}
                  alt="Shared image"
                  className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.content, '_blank')}
                />
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
            {message.isEdited && !message.isDeleted && (
              <span className="text-xs opacity-70 ml-2">(edited)</span>
            )}
          </div>

          {/* Action buttons on hover */}
          {!message.isDeleted && (
            <div
              className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              {/* Reply button (for all messages) */}
              <button
                onClick={() => {
                  if (onReply) onReply(message.id);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-600"
                title="Reply"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </button>

              {/* Reaction button */}
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="p-1 rounded hover:bg-gray-200 text-gray-600"
                title="Add reaction"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Context menu button (for own messages) */}
              {isOwnMessage && (
                <button
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-600"
                  title="More options"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Reaction picker */}
          {showReactionPicker && (
            <div
              className={`absolute top-full mt-1 ${isOwnMessage ? 'right-0' : 'left-0'} bg-white border rounded-lg shadow-lg p-2 flex gap-1 z-10`}
            >
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="text-xl hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {showContextMenu && isOwnMessage && (
            <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={() => {
                  if (onReply) onReply(message.id);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Reply
              </button>
              <button
                onClick={() => {
                  if (onEdit) onEdit(message.id);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              <button
                onClick={() => {
                  if (onDelete) onDelete(message.id);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Display reactions */}
        {aggregatedReactions && Object.keys(aggregatedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(aggregatedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  hasUserReacted(emoji)
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                }`}
                title={data.userNames.join(', ')}
              >
                <span>{emoji}</span>
                <span className="font-medium">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {isOwnMessage && <span className="text-xs text-gray-500 mt-1">{formattedTime}</span>}
      </div>
    </div>
  );
};

export default Message;
