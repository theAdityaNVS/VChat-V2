import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomType } from '../../types/room';
import type { UserDoc } from '../../types/user';
import UserBrowser from './UserBrowser';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (data: {
    name: string;
    type: RoomType;
    description?: string;
    members?: string[];
  }) => Promise<string | null>;
}

const CreateRoomModal = ({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('public');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showUserBrowser, setShowUserBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Room name is required');
      return;
    }

    if (type === 'private' && selectedMembers.length === 0) {
      setError('Please select at least one member for private rooms');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const roomId = await onCreateRoom({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        members: type === 'private' ? selectedMembers : undefined,
      });

      if (roomId) {
        // Reset form
        setName('');
        setType('public');
        setDescription('');
        setSelectedMembers([]);
        setShowUserBrowser(false);
        onClose();
        // Navigate to the new room
        navigate(`/chat/${roomId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setType('public');
      setDescription('');
      setSelectedMembers([]);
      setShowUserBrowser(false);
      setError(null);
      onClose();
    }
  };

  const handleSelectUser = (user: UserDoc) => {
    setSelectedMembers((prev) => {
      if (prev.includes(user.uid)) {
        return prev.filter((id) => id !== user.uid);
      } else {
        return [...prev, user.uid];
      }
    });
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((id) => id !== userId));
  };

  if (!isOpen) return null;

  if (showUserBrowser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-30 backdrop-blur-sm">
        <div className="w-full max-w-2xl h-[600px] rounded-lg bg-white shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Select Members ({selectedMembers.length})
            </h2>
            <button
              onClick={() => setShowUserBrowser(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Back"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <UserBrowser
              onSelectUser={handleSelectUser}
              selectedUsers={selectedMembers}
              multiSelect={true}
            />
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowUserBrowser(false)}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Create New Room</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1">
              Room Name *
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="e.g., General Discussion"
            />
          </div>

          <div>
            <label htmlFor="room-type" className="block text-sm font-medium text-gray-700 mb-1">
              Room Type
            </label>
            <select
              id="room-type"
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              disabled={loading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {type === 'public' ? 'Anyone can join this room' : 'Only invited members can join'}
            </p>
          </div>

          {type === 'private' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Members ({selectedMembers.length})
              </label>
              <button
                type="button"
                onClick={() => setShowUserBrowser(true)}
                disabled={loading}
                className="w-full rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
              >
                + Add Members
              </button>
              {selectedMembers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedMembers.map((memberId) => (
                    <div
                      key={memberId}
                      className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                    >
                      <span>{memberId.substring(0, 8)}...</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(memberId)}
                        className="hover:text-blue-900"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="room-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="What's this room about?"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading || !name.trim() || (type === 'private' && selectedMembers.length === 0)
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
