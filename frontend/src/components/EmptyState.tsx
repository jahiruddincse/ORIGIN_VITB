import React from 'react';
import { FileSearch } from 'lucide-react';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
      <FileSearch className="h-12 w-12 text-slate-400 mb-4" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
