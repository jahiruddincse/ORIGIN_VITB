import React from 'react';
import { FilterOptions } from '../types';

interface FilterBarProps {
  options: FilterOptions;
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function FilterBar({ options, filters, onChange }: FilterBarProps) {
  const selects = [
    { key: 'state', label: 'State', values: options.states },
    { key: 'district', label: 'District', values: options.districts },
    { key: 'status', label: 'Status', values: options.statuses },
    { key: 'severity', label: 'Severity', values: options.severities },
  ];

  return (
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
      {selects.map(s => (
        <div key={s.key} className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">{s.label}</label>
          <select
            value={filters[s.key] || ''}
            onChange={(e) => onChange(s.key, e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
          >
            <option value="">All {s.label}s</option>
            {s.values.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
