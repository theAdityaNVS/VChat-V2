import type { UserStatus } from '../../types/user';

interface StatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const StatusIndicator = ({ status, size = 'md', showText = false }: StatusIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const colorClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };

  const textLabels = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`${sizeClasses[size]} ${colorClasses[status]} rounded-full ring-2 ring-white`}
        aria-label={textLabels[status]}
      />
      {showText && <span className="text-xs text-gray-600">{textLabels[status]}</span>}
    </div>
  );
};

export default StatusIndicator;
