import React from 'react';
import Badge from './Badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getVariant = () => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'delivered':
      case 'completed':
      case 'approved':
      case 'paid':
        return 'success';
      case 'pending':
      case 'processing':
        return 'primary';
      case 'shipped':
      case 'in progress':
        return 'secondary';
      case 'cancelled':
      case 'inactive':
      case 'failed':
        return 'error';
      case 'on hold':
      case 'waiting':
        return 'warning';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default StatusBadge;