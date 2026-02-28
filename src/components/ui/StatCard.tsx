import React from 'react';
import { cn } from '../../utils/cn';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  className,
}) => {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && (
          <div className="p-2 rounded-md bg-primary-50 text-primary-600">
            {icon}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {change && (
          <div className="flex items-center mt-1">
            <span
              className={cn(
                'text-xs font-medium',
                change.isPositive ? 'text-success-600' : 'text-error-600'
              )}
            >
              {change.isPositive ? '+' : ''}
              {change.value}%
            </span>
            <span className="ml-1 text-xs text-gray-500">vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;