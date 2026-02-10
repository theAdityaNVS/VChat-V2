import { useState, useEffect } from 'react';
import { getAllUsers } from '../../lib/userService';
import { useAuth } from '../../hooks/useAuth';
import type { UserDoc } from '../../types/user';
import { StatusIndicator } from '../ui/StatusIndicator';

interface UserBrowserProps {
  onSelectUser?: (user: UserDoc) => void;
  onStartDirectMessage?: (user: UserDoc) => void;
  selectedUsers?: string[];
  multiSelect?: boolean;
}

const UserBrowser = ({
  onSelectUser,
  onStartDirectMessage,
  selectedUsers = [],
  multiSelect = false,
}: UserBrowserProps) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserDoc[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.uid !== currentUser?.uid &&
          (user.displayName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users.filter((user) => user.uid !== currentUser?.uid));
    }
  }, [searchTerm, users, currentUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: UserDoc) => {
    if (onSelectUser) {
      onSelectUser(user);
    }
  };

  const handleDirectMessage = (user: UserDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartDirectMessage) {
      onStartDirectMessage(user);
    }
  };

  const isSelected = (userId: string) => selectedUsers.includes(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg
              className="h-16 w-16 mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li
                key={user.uid}
                onClick={() => handleUserClick(user)}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  isSelected(user.uid) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusIndicator status={user.status || 'offline'} size="small" />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.bio && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {multiSelect && isSelected(user.uid) && (
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {onStartDirectMessage && !multiSelect && (
                      <button
                        onClick={(e) => handleDirectMessage(user, e)}
                        className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors"
                        title="Start direct message"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserBrowser;
