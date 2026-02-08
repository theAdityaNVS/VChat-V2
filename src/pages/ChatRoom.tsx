import { useParams } from 'react-router-dom';
import { useMessages } from '../hooks/useMessages';
import { useRooms } from '../hooks/useRooms';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';

const ChatRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { messages, loading, sendMessage } = useMessages(roomId);
  const { rooms } = useRooms();

  // Find the current room
  const currentRoom = rooms.find((room) => room.id === roomId);

  const handleSendMessage = async (content: string): Promise<boolean> => {
    return await sendMessage({ content });
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
      <MessageList messages={messages} loading={loading} />

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatRoom;
