import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export function SearchBar({ onSearch, placeholder = 'Search...' }: { onSearch: (q: string) => void, placeholder?: string }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative w-full text-slate-400 focus-within:text-indigo-500">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-800 text-slate-300 placeholder-slate-400 focus:outline-none focus:bg-white focus:text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
}
