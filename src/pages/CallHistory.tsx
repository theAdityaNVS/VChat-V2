import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToUserCallLogs } from '../lib/callHistoryService';
import type { CallLog } from '../types/call';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function CallHistory() {
  const { currentUser } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserCallLogs(currentUser.uid, (logs) => {
      setCallLogs(logs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredLogs = callLogs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'incoming') return log.direction === 'incoming' && log.outcome !== 'missed';
    if (filter === 'outgoing') return log.direction === 'outgoing';
    if (filter === 'missed') return log.outcome === 'missed' || log.outcome === 'no-answer';
    return true;
  });

  const getCallIcon = (log: CallLog) => {
    const isMissed = log.outcome === 'missed' || log.outcome === 'no-answer';

    if (isMissed) {
      return <PhoneMissed className="w-5 h-5 text-red-500" />;
    }

    if (log.direction === 'incoming') {
      return <PhoneIncoming className="w-5 h-5 text-green-500" />;
    }

    return <PhoneOutgoing className="w-5 h-5 text-blue-500" />;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOutcomeText = (log: CallLog) => {
    switch (log.outcome) {
      case 'completed':
        return formatDuration(log.duration);
      case 'missed':
        return 'Missed';
      case 'no-answer':
        return 'No answer';
      case 'rejected':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Call History</h1>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('incoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'incoming'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Incoming
          </button>
          <button
            onClick={() => setFilter('outgoing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'outgoing'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Outgoing
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'missed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Missed
          </button>
        </div>
      </div>

      {/* Call logs list */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Phone className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No call history</p>
            <p className="text-sm">Your call logs will appear here</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredLogs.map((log) => {
              const otherUser =
                log.direction === 'outgoing'
                  ? { name: log.calleeName, avatar: log.calleeAvatar }
                  : { name: log.callerName, avatar: log.callerAvatar };

              return (
                <Card
                  key={log.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Call icon */}
                    <div className="flex-shrink-0">{getCallIcon(log)}</div>

                    {/* User avatar */}
                    <div className="flex-shrink-0">
                      {otherUser.avatar ? (
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {otherUser.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Call details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {otherUser.name}
                        </p>
                        {log.mediaType === 'video' && <Video className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{log.direction === 'incoming' ? 'Incoming' : 'Outgoing'}</span>
                        <span>•</span>
                        <span>{getOutcomeText(log)}</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
