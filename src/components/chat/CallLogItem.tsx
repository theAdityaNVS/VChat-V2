import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import type { CallLog } from '../../types/call';

interface CallLogItemProps {
  log: CallLog;
  currentUserId: string;
}

export function CallLogItem({ log, currentUserId }: CallLogItemProps) {
  const isOutgoing = log.callerId === currentUserId;
  const isMissed = log.outcome === 'missed' || log.outcome === 'no-answer';

  const getCallIcon = () => {
    if (isMissed) {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }

    if (isOutgoing) {
      return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
    }

    return <PhoneIncoming className="w-4 h-4 text-green-500" />;
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

  const getCallText = () => {
    const mediaIcon =
      log.mediaType === 'video' ? (
        <Video className="w-4 h-4 inline" />
      ) : (
        <Phone className="w-4 h-4 inline" />
      );

    let statusText = '';
    switch (log.outcome) {
      case 'completed':
        statusText = formatDuration(log.duration);
        break;
      case 'missed':
        statusText = 'Missed call';
        break;
      case 'no-answer':
        statusText = 'No answer';
        break;
      case 'rejected':
        statusText = 'Declined';
        break;
      case 'cancelled':
        statusText = 'Cancelled';
        break;
    }

    return (
      <span className="flex items-center gap-2">
        {mediaIcon}
        <span>
          {isOutgoing ? 'Outgoing' : 'Incoming'} {log.mediaType} call
        </span>
        {statusText && (
          <>
            <span>•</span>
            <span>{statusText}</span>
          </>
        )}
      </span>
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-lg max-w-md ${
          isMissed
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex-shrink-0">{getCallIcon()}</div>
        <div className="flex-1 text-sm">{getCallText()}</div>
        <div className="flex-shrink-0 text-xs opacity-75">{formatTime(log.timestamp)}</div>
      </div>
    </div>
  );
}
