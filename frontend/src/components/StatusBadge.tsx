import React from 'react';

const STATUS_CONFIG = {
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Pending': 'bg-amber-100 text-amber-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Under Review': 'bg-blue-100 text-blue-800',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 'bg-gray-100 text-gray-800';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
