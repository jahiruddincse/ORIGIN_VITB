import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}
