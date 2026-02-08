import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRooms } from '../../hooks/useRooms';
import RoomList from '../chat/RoomList';
import CreateRoomModal from '../chat/CreateRoomModal';

const Sidebar = () => {
  const { currentUser, userDoc, logout } = useAuth();
  const { rooms, loading, createRoom } = useRooms();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'rooms' | 'direct'>('rooms');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayName = userDoc?.displayName || currentUser?.email || 'User';
  const initial = displayName[0].toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* User Profile Section */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'rooms'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rooms
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'direct'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Direct Messages
          </button>
        </div>
      </div>

      {/* Room/DM List */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'rooms' ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Your Rooms</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Create room"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
            <RoomList rooms={rooms} loading={loading} />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Direct Messages
            </p>
            {/* DM list will be populated here */}
            <div className="px-3 py-2 text-sm text-gray-500 text-center">No conversations yet.</div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t p-4 space-y-2">
        <Link
          to="/profile"
          className="block w-full rounded-md bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Profile Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Logout
        </button>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={createRoom}
      />
    </div>
  );
};

export default Sidebar;
