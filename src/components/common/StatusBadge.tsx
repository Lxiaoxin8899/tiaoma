import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  // 支持 boolean/number 是为了在“系统设置”等页面直接展示开关/数值状态
  status: string | number | boolean;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  color = 'gray', 
  text,
  size = 'md',
  className 
}) => {
  const displayText = text ?? (typeof status === 'string' ? status : String(status));
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium border',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      <span
        className={clsx(
          'inline-block h-2 w-2 rounded-full mr-1.5',
          {
            'bg-green-500': color === 'green',
            'bg-red-500': color === 'red',
            'bg-yellow-500': color === 'yellow',
            'bg-blue-500': color === 'blue',
            'bg-gray-500': color === 'gray',
            'bg-purple-500': color === 'purple'
          }
        )}
      />
      {displayText}
    </span>
  );
};

export default StatusBadge;
