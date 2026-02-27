import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRooms } from '../../hooks/useRooms';
import { useTheme } from '../../context/ThemeContext';
import RoomList from '../chat/RoomList';
import CreateRoomModal from '../chat/CreateRoomModal';
import UserBrowser from '../chat/UserBrowser';
import { createDirectMessage, joinRoom, requestToJoinRoom } from '../../lib/roomService';
import type { UserDoc } from '../../types/user';
import { Phone, Moon, Sun } from 'lucide-react';

const Sidebar = () => {
  const { currentUser, userDoc, logout } = useAuth();
  const { rooms, loading, createRoom } = useRooms();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'rooms' | 'direct'>('rooms');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showUserBrowser, setShowUserBrowser] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleStartDirectMessage = async (user: UserDoc) => {
    if (!currentUser) return;

    try {
      const roomId = await createDirectMessage(currentUser.uid, user.uid, user.displayName);
      setShowUserBrowser(false);
      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error('Failed to start direct message:', error);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!currentUser) return;

    try {
      await joinRoom(roomId, currentUser.uid);
      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleRequestJoin = async (roomId: string) => {
    if (!currentUser || !userDoc) return;

    try {
      await requestToJoinRoom(roomId, currentUser.uid, userDoc.displayName);
      alert('Join request sent successfully!');
    } catch (error) {
      console.error('Failed to request join:', error);
      alert(error instanceof Error ? error.message : 'Failed to send join request');
    }
  };

  const displayName = userDoc?.displayName || currentUser?.email || 'User';
  const initial = displayName[0].toUpperCase();

  // Filter rooms based on active tab
  const regularRooms = rooms.filter((room) => room.type !== 'direct');
  const directMessageRooms = rooms.filter((room) => room.type === 'direct');

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* User Profile Section */}
      <div className="border-b dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'rooms'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Rooms
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'direct'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Your Rooms
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
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
            <RoomList
              rooms={regularRooms}
              loading={loading}
              onJoinRoom={handleJoinRoom}
              onRequestJoin={handleRequestJoin}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Direct Messages
              </p>
              <button
                onClick={() => setShowUserBrowser(!showUserBrowser)}
                className="rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="New message"
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
            {showUserBrowser ? (
              <UserBrowser onStartDirectMessage={handleStartDirectMessage} />
            ) : (
              <RoomList
                rooms={directMessageRooms}
                loading={loading}
                onJoinRoom={handleJoinRoom}
                onRequestJoin={handleRequestJoin}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t dark:border-gray-700 p-4 space-y-2">
        <Link
          to="/calls"
          className="flex items-center justify-center gap-2 w-full rounded-md bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <Phone className="w-4 h-4" />
          Call History
        </Link>
        <Link
          to="/profile"
          className="block w-full rounded-md bg-gray-100 dark:bg-gray-800 px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Profile Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-red-50 dark:bg-red-900/30 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
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
