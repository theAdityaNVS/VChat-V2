import { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import CreateRoomModal from '../components/chat/CreateRoomModal';

const ChatWelcome = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createRoom } = useRooms();

  return (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <svg
            className="h-24 w-24 text-gray-400"
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
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to VChat</h2>
        <p className="text-gray-500 mb-6">Select a room from the sidebar to start chatting</p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-md bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Create New Room
        </button>
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={createRoom}
      />
    </div>
  );
};

export default ChatWelcome;
