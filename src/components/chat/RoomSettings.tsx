import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers } from '../../lib/userService';
import {
  addRoomMember,
  removeRoomMember,
  getRoomJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../../lib/roomService';
import type { Room } from '../../types/room';
import type { UserDoc } from '../../types/user';

interface RoomSettingsProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
}

const RoomSettings = ({ room, isOpen, onClose }: RoomSettingsProps) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'requests'>('details');
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [roomMembers, setRoomMembers] = useState<UserDoc[]>([]);
  const [joinRequests, setJoinRequests] = useState<
    Array<{
      id: string;
      userId: string;
      userName: string;
      status: string;
      requestedAt: Date;
    }>
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser && room.createdBy === currentUser.uid;
  const canManageMembers = isAdmin && room.type === 'private';

  useEffect(() => {
    if (isOpen && canManageMembers) {
      loadUsers();
      loadJoinRequests();
    }
  }, [isOpen, canManageMembers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const users = await getAllUsers();
      setAllUsers(users);

      // Filter users who are already members
      const members = users.filter((user) => room.members.includes(user.uid));
      setRoomMembers(members);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    if (!room.id) return;

    try {
      const requests = await getRoomJoinRequests(room.id);
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!room.id) return;

    try {
      await addRoomMember(room.id, userId);
      await loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!room.id || userId === room.createdBy) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await removeRoomMember(room.id, userId);
      await loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleApproveRequest = async (requestId: string, userId: string) => {
    if (!room.id) return;

    try {
      await approveJoinRequest(room.id, requestId, userId);
      await loadJoinRequests();
      await loadUsers();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!room.id) return;

    try {
      await rejectJoinRequest(room.id, requestId);
      await loadJoinRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const availableUsers = allUsers.filter(
    (user) =>
      !room.members.includes(user.uid) &&
      (searchTerm === '' ||
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">Room Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'members'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Members ({room.members.length})
            </button>
            {canManageMembers && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === 'requests'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Requests {joinRequests.length > 0 && `(${joinRequests.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4">
          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Room Name</label>
                <p className="mt-1 text-gray-900">{room.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="mt-1 capitalize text-gray-900">{room.type}</p>
              </div>
              {room.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-gray-900">{room.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-gray-900">
                  {room.createdAt ? new Date(room.createdAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          ) : activeTab === 'members' ? (
            <div className="space-y-4">
              {/* Current Members */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Current Members</h3>
                {loading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    {roomMembers.map((member) => (
                      <div
                        key={member.uid}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {member.displayName[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.displayName}
                              {member.uid === room.createdBy && (
                                <span className="ml-2 text-xs text-blue-600">(Admin)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        {canManageMembers && member.uid !== room.createdBy && (
                          <button
                            onClick={() => handleRemoveMember(member.uid)}
                            className="rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Members (only for private rooms and admin) */}
              {canManageMembers && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Add Members</h3>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {searchTerm ? 'No users found' : 'All users are already members'}
                      </p>
                    ) : (
                      availableUsers.map((user) => (
                        <div
                          key={user.uid}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold">
                              {user.displayName[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.displayName}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddMember(user.uid)}
                            className="rounded-md bg-blue-50 px-3 py-1 text-sm text-blue-600 hover:bg-blue-100"
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Join Requests tab
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Pending Join Requests</h3>
              {joinRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {joinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{request.userName}</p>
                        <p className="text-xs text-gray-500">
                          Requested {request.requestedAt.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.userId)}
                          className="rounded-md bg-green-50 px-3 py-1 text-sm text-green-600 hover:bg-green-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="rounded-md bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSettings;
