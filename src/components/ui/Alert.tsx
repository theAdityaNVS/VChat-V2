import { AlertCircle } from 'lucide-react';

interface AlertProps {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'error' }) => {
  const baseStyles = 'rounded-lg p-4 flex items-gap-3 gap-3';

  const typeStyles = {
    error:
      'bg-error/10 dark:bg-red-900/20 text-error dark:text-red-400 border border-error/30 dark:border-red-700',
    success:
      'bg-success/10 dark:bg-green-900/20 text-success dark:text-green-400 border border-success/30 dark:border-green-700',
    warning:
      'bg-warning/10 dark:bg-yellow-900/20 text-warning dark:text-yellow-400 border border-warning/30 dark:border-yellow-700',
    info: 'bg-primary-100 dark:bg-blue-900/20 text-primary-700 dark:text-blue-400 border border-primary-300 dark:border-blue-700',
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]}`}>
      <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm">{message}</p>
    </div>
  );
};
