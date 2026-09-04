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

  const activeFilters = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    Object.keys(filters).forEach((key) => {
      onChange(key, '');
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Monitoring Filters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Narrow claims to focus on priority cases
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFilters > 0 && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {activeFilters} active
            </span>
          )}

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-4">
        {selects.map((select) => {
          const isActive = Boolean(filters[select.key]);

          return (
            <div key={select.key} className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {select.label}
              </label>

              <select
                value={filters[select.key] || ''}
                onChange={(e) => onChange(select.key, e.target.value)}
                className={`block w-full pl-3 pr-10 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <option value="">All {select.label}s</option>

                {select.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}