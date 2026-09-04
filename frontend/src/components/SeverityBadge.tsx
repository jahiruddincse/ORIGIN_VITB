import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

const SEVERITY_CONFIG = {
  Critical: { color: 'text-red-800 bg-red-100', icon: ShieldAlert },
  High: { color: 'text-orange-800 bg-orange-100', icon: AlertTriangle },
  Medium: { color: 'text-amber-800 bg-amber-100', icon: AlertCircle },
  Low: { color: 'text-blue-800 bg-blue-100', icon: Info },
  Normal: { color: 'text-gray-800 bg-gray-100', icon: ShieldCheck },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.Normal;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {severity}
    </span>
  );
}
