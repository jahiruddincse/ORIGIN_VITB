import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor?: string;
  subtitle?: string;
}

export function KPICard({ title, value, icon: Icon, iconColor = 'text-indigo-600', subtitle }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex items-center">
      <div className={`p-3 rounded-full bg-slate-50 mr-4 ${iconColor}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
