import { Link, useParams } from 'react-router-dom';
import type { Room } from '../../types/room';

interface RoomListProps {
  rooms: Room[];
  loading: boolean;
}

const RoomList = ({ rooms, loading }: RoomListProps) => {
  const { roomId } = useParams();

  if (loading) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 text-center">
        No rooms yet. Create one to get started!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rooms.map((room) => {
        const isActive = roomId === room.id;
        const roomInitial = room.name[0].toUpperCase();

        return (
          <Link
            key={room.id}
            to={`/chat/${room.id}`}
            className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors ${
              isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div
              className={`h-10 w-10 flex-shrink-0 rounded-lg flex items-center justify-center font-semibold ${
                isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {room.avatarUrl ? (
                <img
                  src={room.avatarUrl}
                  alt={room.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                roomInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{room.name}</p>
              {room.lastMessage && (
                <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>
              )}
            </div>
            {room.type === 'private' && (
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default RoomList;
