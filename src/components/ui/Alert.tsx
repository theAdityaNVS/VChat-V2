import { AlertCircle } from 'lucide-react';

interface AlertProps {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'error' }) => {
  const baseStyles = 'rounded-lg p-4 flex items-gap-3 gap-3';

  const typeStyles = {
    error: 'bg-error/10 text-error border border-error/30',
    success: 'bg-success/10 text-success border border-success/30',
    warning: 'bg-warning/10 text-warning border border-warning/30',
    info: 'bg-primary-100 text-primary-700 border border-primary-300',
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]}`}>
      <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm">{message}</p>
    </div>
  );
};
