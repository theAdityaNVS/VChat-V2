import { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Message from './Message';
import { CallLogItem } from './CallLogItem';
import type { Message as MessageType } from '../../types/message';
import type { CallLog } from '../../types/call';

type TimelineItem = { type: 'message'; data: MessageType } | { type: 'callLog'; data: CallLog };

interface MessageListProps {
  messages: MessageType[];
  callLogs?: CallLog[];
  loading: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

const MessageList = ({
  messages,
  callLogs = [],
  loading,
  onReaction,
  onEdit,
  onDelete,
  onReply,
}: MessageListProps) => {
  const { currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Merge and sort messages and call logs by timestamp
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...messages.map((msg) => ({ type: 'message' as const, data: msg })),
      ...callLogs.map((log) => ({ type: 'callLog' as const, data: log })),
    ];

    return items.sort((a, b) => {
      const aTime = a.type === 'message' ? a.data.createdAt : a.data.timestamp;
      const bTime = b.type === 'message' ? b.data.createdAt : b.data.timestamp;
      const aDate = aTime instanceof Date ? aTime : aTime.toDate();
      const bDate = bTime instanceof Date ? bTime : bTime.toDate();
      return aDate.getTime() - bDate.getTime();
    });
  }, [messages, callLogs]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && callLogs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-500">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col space-y-4">
        {timeline.map((item) => {
          if (item.type === 'message') {
            const message = item.data;
            // Find the message being replied to if this message is a reply
            const replyToMessage = message.replyTo
              ? messages.find((m) => m.id === message.replyTo)
              : undefined;

            return (
              <Message
                key={`msg-${message.id}`}
                message={message}
                isOwnMessage={message.senderId === currentUser?.uid}
                currentUserId={currentUser?.uid || ''}
                currentUserName={currentUser?.displayName || currentUser?.email || 'Unknown'}
                onReaction={onReaction}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                replyToMessage={replyToMessage}
              />
            );
          } else {
            // Render call log
            return (
              <CallLogItem
                key={`call-${item.data.id}`}
                log={item.data}
                currentUserId={currentUser?.uid || ''}
              />
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
