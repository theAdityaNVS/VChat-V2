import { formatDistanceToNow } from 'date-fns';
import type { Message as MessageType } from '../../types/message';

interface MessageProps {
  message: MessageType;
  isOwnMessage: boolean;
}

const Message = ({ message, isOwnMessage }: MessageProps) => {
  const formattedTime = formatDistanceToNow(message.createdAt, { addSuffix: true });

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
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
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

        <div
          className={`rounded-lg px-4 py-2 ${
            isOwnMessage
              ? 'bg-blue-600 text-white'
              : message.isDeleted
                ? 'bg-gray-100 text-gray-400 italic'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          {message.isEdited && !message.isDeleted && (
            <span className="text-xs opacity-70 ml-2">(edited)</span>
          )}
        </div>

        {isOwnMessage && <span className="text-xs text-gray-500 mt-1">{formattedTime}</span>}
      </div>
    </div>
  );
};

export default Message;
