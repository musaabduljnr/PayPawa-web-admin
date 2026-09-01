import React from 'react';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: string;
  type?: 'transaction' | 'customer' | 'meter' | 'general';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general' }) => {
  const normalized = (status || '').toLowerCase();

  if (type === 'transaction') {
    switch (normalized) {
      case 'successful':
      case 'completed':
        return <Badge variant="active">Successful</Badge>;
      case 'processing':
      case 'initiated':
        return <Badge variant="pending">{normalized.toUpperCase()}</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'unknown':
      default:
        return <Badge variant="neutral">In-Flight / Unknown</Badge>;
    }
  }

  if (type === 'customer') {
    switch (normalized) {
      case 'true':
      case 'active':
      case 'onboarded':
        return <Badge variant="active">Onboarded</Badge>;
      case 'false':
      case 'unverified':
      case 'pending':
        return <Badge variant="pending">Pending Setup</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  }

  if (type === 'meter') {
    switch (normalized) {
      case 'true':
      case 'active':
        return <Badge variant="active">Active</Badge>;
      case 'false':
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  }

  return <Badge variant="neutral">{status}</Badge>;
};
