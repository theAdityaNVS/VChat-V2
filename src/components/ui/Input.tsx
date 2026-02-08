import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>}
        <div className="relative">
          {Icon && (
            <Icon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${Icon ? 'pl-10' : ''}
              ${error ? 'border-error ring-2 ring-error/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-error text-sm mt-1">{error}</p>}
        {helperText && !error && <p className="text-gray-600 text-sm mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
