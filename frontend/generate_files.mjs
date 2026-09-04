import fs from 'fs';
import path from 'path';

const baseDir = '/Users/mdjahiruddinahmed/.gemini/antigravity/scratch/fra-monitor/frontend';

const files = {
  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})`,
  'src/index.css': `@import 'tailwindcss';
@import 'leaflet/dist/leaflet.css';

/* Fix Leaflet default icon issue */
.leaflet-default-icon-path {
  background-image: url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png');
}
`,
  'src/types/index.ts': `export interface Claim {
  claim_id: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  claimant_name: string;
  claim_type: string;
  area_acres: number;
  submission_date: string;
  approval_date: string | null;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Under Review';
  land_record_status: string;
  documents_complete: boolean;
  days_pending: number;
  anomaly_score: number;
  severity: 'Normal' | 'Low' | 'Medium' | 'High' | 'Critical';
  anomaly_types: string;
  created_at: string;
}

export interface DashboardData {
  total_claims: number;
  approved: number;
  pending: number;
  rejected: number;
  under_review: number;
  approval_percentage: number;
  total_anomalies: number;
  high_priority_anomalies: number;
  avg_processing_days: number;
  recent_anomalies: Claim[];
}

export interface StateStats {
  state: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  under_review: number;
  anomalies: number;
  high_priority: number;
  approval_rate: number;
  avg_processing_days: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FilterOptions {
  states: string[];
  districts: string[];
  statuses: string[];
  severities: string[];
  anomaly_types: string[];
}

export interface AIAnalysis {
  summary: string;
  why_flagged: string[];
  severity_assessment: string;
  recommended_action: string;
  evidence: Record<string, string>;
  disclaimer: string;
}

export interface StateSummary {
  summary: string;
}
`,
  'src/services/api.ts': `import { DashboardData, PaginatedResponse, Claim, StateStats, FilterOptions, AIAnalysis, StateSummary } from '../types';

const API_BASE = '/api';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(\`API Error: \${res.statusText}\`);
  }
  return res.json();
}

export const api = {
  getDashboard: () => fetcher<DashboardData>(\`\${API_BASE}/dashboard\`),
  
  getClaims: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return fetcher<PaginatedResponse<Claim>>(\`\${API_BASE}/claims?\${query}\`);
  },
  
  getClaim: (id: string) => fetcher<Claim>(\`\${API_BASE}/claims/\${id}\`),
  
  getStates: () => fetcher<StateStats[]>(\`\${API_BASE}/states\`),
  
  getStateDetail: (state: string) => fetcher<{state_stats: StateStats, districts: any[]}>(\`\${API_BASE}/states/\${state}\`),
  
  getAnomalies: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return fetcher<PaginatedResponse<Claim>>(\`\${API_BASE}/anomalies?\${query}\`);
  },
  
  getFilters: () => fetcher<FilterOptions>(\`\${API_BASE}/filters\`),
  
  analyzeClaimAI: (claimId: string) => fetcher<AIAnalysis>(\`\${API_BASE}/ai/analyze-claim\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim_id: claimId })
  }),
  
  getStateSummary: (state: string) => fetcher<StateSummary>(\`\${API_BASE}/ai/state-summary\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state })
  })
};
`,
  'src/hooks/useApi.ts': `import { useState, useEffect } from 'react';

export function useApi<T>(apiFunc: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    apiFunc()
      .then(res => {
        if (mounted) setData(res);
      })
      .catch(err => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    return () => { mounted = false; };
  }, deps);

  return { data, loading, error };
}
`,
  'src/components/Layout.tsx': `import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, Map } from 'lucide-react';
import { SearchBar } from './SearchBar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Claims Explorer', path: '/claims', icon: FileText },
    { name: 'State Intelligence', path: '/states', icon: Map },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-indigo-400" />
                <span className="font-bold text-xl tracking-tight">VanRaksha AI</span>
              </Link>
              
              <nav className="hidden md:flex space-x-4">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={\`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium \${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}\`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            <div className="flex-1 max-w-md ml-8">
              <SearchBar onSearch={(q) => console.log('Global search:', q)} placeholder="Search claim ID, claimant..." />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          Prototype — Demonstration Data
        </div>
      </footer>
    </div>
  );
}
`,
  'src/components/SeverityBadge.tsx': `import React from 'react';
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
    <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${config.color}\`}>
      <Icon className="w-3 h-3 mr-1" />
      {severity}
    </span>
  );
}
`,
  'src/components/StatusBadge.tsx': `import React from 'react';

const STATUS_CONFIG = {
  'Approved': 'bg-emerald-100 text-emerald-800',
  'Pending': 'bg-amber-100 text-amber-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Under Review': 'bg-blue-100 text-blue-800',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 'bg-gray-100 text-gray-800';
  
  return (
    <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${color}\`}>
      {status}
    </span>
  );
}
`,
  'src/components/KPICard.tsx': `import React from 'react';

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
      <div className={\`p-3 rounded-full bg-slate-50 mr-4 \${iconColor}\`}>
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
`,
  'src/components/LoadingSpinner.tsx': `import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}
`,
  'src/components/ErrorState.tsx': `import React from 'react';
import { AlertCircle } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-slate-900 mb-2">Something went wrong</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
`,
  'src/components/EmptyState.tsx': `import React from 'react';
import { FileSearch } from 'lucide-react';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
      <FileSearch className="h-12 w-12 text-slate-400 mb-4" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
`,
  'src/components/SearchBar.tsx': `import React, { useState, useEffect } from 'react';
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
`,
  'src/components/FilterBar.tsx': `import React from 'react';
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
`,
  'src/components/IndiaMap.tsx': `import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Claim } from '../types';
import { ClaimMapPopup } from './ClaimMapPopup';

const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  Normal: '#6b7280',
};

function MapViewRecenter({ lat, lng, zoom }: { lat: number, lng: number, zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

export function IndiaMap({ claims, className = 'h-[500px]' }: { claims: Claim[], className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={\`w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm \${className}\`}>
      <MapContainer center={[22.5, 82]} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {claims.map((claim) => (
          <CircleMarker
            key={claim.claim_id}
            center={[claim.latitude, claim.longitude]}
            radius={claim.severity === 'Critical' || claim.severity === 'High' ? 8 : 5}
            pathOptions={{
              color: SEVERITY_COLORS[claim.severity as keyof typeof SEVERITY_COLORS] || '#6b7280',
              fillColor: SEVERITY_COLORS[claim.severity as keyof typeof SEVERITY_COLORS] || '#6b7280',
              fillOpacity: 0.7,
              weight: 2
            }}
            eventHandlers={{
              click: () => navigate(\`/claims/\${claim.claim_id}\`),
            }}
          >
            <Popup>
              <ClaimMapPopup claim={claim} />
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
`,
  'src/components/ClaimMapPopup.tsx': `import React from 'react';
import { Claim } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export function ClaimMapPopup({ claim }: { claim: Claim }) {
  return (
    <div className="p-1 min-w-[200px]">
      <div className="font-semibold text-sm mb-1">{claim.claim_id}</div>
      <div className="text-xs text-slate-600 mb-2">{claim.claimant_name}</div>
      <div className="flex gap-2 mb-2">
        <StatusBadge status={claim.status} />
        <SeverityBadge severity={claim.severity} />
      </div>
      <div className="text-xs text-slate-500">
        {claim.district}, {claim.state}
      </div>
    </div>
  );
}
`,
  'src/pages/Dashboard.tsx': `import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle, Clock, XCircle, TrendingUp, AlertTriangle, AlertOctagon, Calendar, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from '../components/KPICard';
import { IndiaMap } from '../components/IndiaMap';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { DashboardData, StateStats } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<{dash: DashboardData, states: StateStats[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getStates()])
      .then(([dash, states]) => setData({ dash, states }))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading command center..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const { dash, states } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Claims" value={dash.total_claims} icon={BarChart3} />
        <KPICard title="Approved" value={dash.approved} icon={CheckCircle} iconColor="text-emerald-600" />
        <KPICard title="Pending" value={dash.pending} icon={Clock} iconColor="text-amber-600" />
        <KPICard title="Rejected" value={dash.rejected} icon={XCircle} iconColor="text-red-600" />
        <KPICard title="Approval Rate" value={\`\${dash.approval_percentage.toFixed(1)}%\`} icon={TrendingUp} />
        <KPICard title="Total Anomalies" value={dash.total_anomalies} icon={AlertTriangle} iconColor="text-orange-600" />
        <KPICard title="High Priority" value={dash.high_priority_anomalies} icon={AlertOctagon} iconColor="text-red-600" />
        <KPICard title="Avg Processing" value={\`\${Math.round(dash.avg_processing_days)}d\`} icon={Calendar} iconColor="text-blue-600" />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Live Anomaly Map</h2>
        <IndiaMap claims={dash.recent_anomalies} className="h-[600px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">State Performance</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={states}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="state" tick={{fontSize: 12}} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="approved" stackId="a" fill="#10b981" name="Approved" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Critical Anomalies</h2>
            <Link to="/claims" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {dash.recent_anomalies.slice(0, 8).map(claim => (
                <Link key={claim.claim_id} to={\`/claims/\${claim.claim_id}\`} className="block border border-slate-100 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-slate-900">{claim.claim_id}</div>
                    <SeverityBadge severity={claim.severity} />
                  </div>
                  <div className="text-sm text-slate-500 mb-2">{claim.claimant_name} • {claim.district}, {claim.state}</div>
                  <div className="flex justify-between items-center text-xs">
                    <StatusBadge status={claim.status} />
                    <span className="text-slate-400">{claim.days_pending} days pending</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
  'src/pages/ClaimsExplorer.tsx': `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { Claim, FilterOptions } from '../types';

export default function ClaimsExplorer() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.getFilters().then(setFilterOptions).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getClaims({ ...filters, page, limit: 20 })
      .then(res => {
        setClaims(res.data);
        setTotalPages(res.pages);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filters, page]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Claims Explorer</h1>
      </div>

      {filterOptions && (
        <FilterBar options={filterOptions} filters={filters} onChange={handleFilterChange} />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : claims.length === 0 ? (
          <EmptyState message="No claims match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Claim ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Days</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {claims.map((claim) => (
                  <tr 
                    key={claim.claim_id} 
                    onClick={() => navigate(\`/claims/\${claim.claim_id}\`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{claim.claim_id}</div>
                      <div className="text-xs text-slate-500">{claim.claimant_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{claim.district}</div>
                      <div className="text-xs text-slate-500">{claim.state}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={claim.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {claim.anomaly_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {claim.days_pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
`,
  'src/pages/ClaimDetail.tsx': `import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Sparkles, AlertTriangle, ShieldCheck, Clock, MapPin, FileText, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Claim, AIAnalysis } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';

export default function ClaimDetail() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    setLoading(true);
    api.getClaim(claimId)
      .then(setClaim)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [claimId]);

  const analyzeWithAI = async () => {
    if (!claim) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.analyzeClaimAI(claim.claim_id);
      setAiAnalysis(res);
    } catch (err: any) {
      setAiError("AI service temporarily unavailable");
      // Deterministic fallback based on anomalies
      try {
        const types = JSON.parse(claim.anomaly_types || '[]');
        setAiAnalysis({
          summary: \`Automated fallback analysis based on rules. This claim exhibits \${types.length} flagged issues.\`,
          why_flagged: types,
          severity_assessment: claim.severity,
          recommended_action: "Manual review required by local authorities due to detected discrepancies.",
          evidence: { "System": "Rule-based fallback due to AI service unavailability." },
          disclaimer: "This is a deterministic fallback assessment."
        });
      } catch (e) {
        // Ignore fallback error
      }
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !claim) return <ErrorState message={error?.message || "Not found"} />;

  let anomalyTypes: string[] = [];
  try {
    anomalyTypes = typeof claim.anomaly_types === 'string' ? JSON.parse(claim.anomaly_types) : [];
  } catch (e) {}

  const anomalyDescriptions: Record<string, string> = {
    'DELAYED_CLAIM': "Claim pending beyond threshold (180 days)",
    'LAND_RECORD_MISMATCH': "Land records show discrepancy",
    'INCOMPLETE_DOCUMENTATION': "Required documents missing",
    'UNUSUAL_AREA': "Claimed area significantly above average",
    'GEOGRAPHIC_INCONSISTENCY': "Location coordinates may be incorrect",
    'POSSIBLE_DUPLICATE': "Potential duplicate submission detected"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-900">{claim.claim_id}</h1>
        <div className="text-slate-500 mt-1 flex items-center space-x-2">
          <MapPin className="h-4 w-4" />
          <span>{claim.district}, {claim.state}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 mb-1">Current Status</div>
              <StatusBadge status={claim.status} />
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Processing Time</div>
              <div className="text-xl font-bold text-slate-900 flex items-center justify-end">
                <Clock className="h-5 w-5 mr-2 text-slate-400" />
                {claim.days_pending} days
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Anomaly Score</h2>
              <SeverityBadge severity={claim.severity} />
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
              <div 
                className={\`h-4 rounded-full \${claim.severity === 'Critical' ? 'bg-red-500' : claim.severity === 'High' ? 'bg-orange-500' : claim.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}\`} 
                style={{ width: \`\${claim.anomaly_score}%\` }}
              ></div>
            </div>
            <div className="text-right text-sm font-medium text-slate-700">{claim.anomaly_score} / 100</div>

            {anomalyTypes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-900 mb-3 uppercase tracking-wider">Flagged Issues</h3>
                <ul className="space-y-3">
                  {anomalyTypes.map(type => (
                    <li key={type} className="flex items-start bg-amber-50 p-3 rounded-md border border-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-amber-900 text-sm">{type}</div>
                        <div className="text-xs text-amber-700 mt-1">{anomalyDescriptions[type] || "Anomaly detected"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-slate-400" /> Raw Evidence
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-slate-500">Claimant</div>
              <div className="font-medium">{claim.claimant_name}</div>
              <div className="text-slate-500">Type</div>
              <div className="font-medium">{claim.claim_type}</div>
              <div className="text-slate-500">Area</div>
              <div className="font-medium">{claim.area_acres} acres</div>
              <div className="text-slate-500">Submitted</div>
              <div className="font-medium">{new Date(claim.submission_date).toLocaleDateString()}</div>
              <div className="text-slate-500">Land Record</div>
              <div className="font-medium">{claim.land_record_status}</div>
              <div className="text-slate-500">Documents</div>
              <div className="font-medium">{claim.documents_complete ? 'Complete' : 'Incomplete'}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-200 h-[300px] overflow-hidden">
            <MapContainer center={[claim.latitude, claim.longitude]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[claim.latitude, claim.longitude]} />
            </MapContainer>
          </div>

          <div className="bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Sparkles className="w-32 h-32" />
            </div>
            
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-indigo-400" /> AI Assistant
            </h2>

            {!aiAnalysis && !aiLoading && (
              <div className="text-center py-8 relative z-10">
                <p className="text-slate-400 mb-6 text-sm">Generate a comprehensive intelligence report for this claim.</p>
                <button 
                  onClick={analyzeWithAI}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center justify-center mx-auto"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Analyze with AI
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="py-12 flex flex-col items-center relative z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-4"></div>
                <p className="text-indigo-200 text-sm">Synthesizing data and rules...</p>
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-5 relative z-10 text-sm text-slate-300">
                {aiError && (
                  <div className="bg-amber-900/50 border border-amber-700 text-amber-200 p-3 rounded text-xs mb-4">
                    {aiError}
                  </div>
                )}
                
                <div className="bg-slate-800/50 p-4 rounded-md border border-slate-700">
                  <p className="text-slate-200 leading-relaxed">{aiAnalysis.summary}</p>
                </div>

                <div>
                  <h3 className="text-indigo-400 font-semibold mb-2">Why Flagged:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {aiAnalysis.why_flagged.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="text-xs text-slate-400 uppercase">Severity</div>
                    <div className="font-semibold text-white mt-1">{aiAnalysis.severity_assessment}</div>
                  </div>
                </div>

                <div className="bg-indigo-900/30 border border-indigo-800 p-4 rounded-md">
                  <h3 className="text-indigo-300 font-semibold mb-1 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" /> Recommended Action
                  </h3>
                  <p className="text-white">{aiAnalysis.recommended_action}</p>
                </div>

                <div className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800">
                  {aiAnalysis.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`,
  'src/pages/StateIntelligence.tsx': `import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { StateStats } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';

export default function StateIntelligence() {
  const [states, setStates] = useState<StateStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    api.getStates()
      .then(setStates)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">State Intelligence</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-96">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Inter-State Processing Comparison</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={states}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="state" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="total" fill="#94a3b8" name="Total Claims" />
            <Bar yAxisId="right" dataKey="avg_processing_days" fill="#6366f1" name="Avg Processing Days" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {states.map(state => (
          <StateCard key={state.state} state={state} />
        ))}
      </div>
    </div>
  );
}

function StateCard({ state }: { state: StateStats }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getStateSummary(state.state);
      setSummary(res.summary);
    } catch (e) {
      setSummary("Summary unavailable at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-indigo-500" /> {state.state}
        </h3>
      </div>
      
      <div className="p-5 flex-1">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs text-slate-500 uppercase">Total</div>
            <div className="text-xl font-semibold">{state.total}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Approval Rate</div>
            <div className="text-xl font-semibold text-emerald-600">{state.approval_rate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Anomalies</div>
            <div className="text-xl font-semibold text-orange-600">{state.anomalies}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Avg Time</div>
            <div className="text-xl font-semibold text-blue-600">{Math.round(state.avg_processing_days)}d</div>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-600 font-medium">Approved ({state.approved})</span>
            <span className="text-amber-600 font-medium">Pending ({state.pending})</span>
            <span className="text-red-600 font-medium">Rejected ({state.rejected})</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: \`\${(state.approved/state.total)*100}%\` }}></div>
            <div className="bg-amber-400 h-full" style={{ width: \`\${(state.pending/state.total)*100}%\` }}></div>
            <div className="bg-red-500 h-full" style={{ width: \`\${(state.rejected/state.total)*100}%\` }}></div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
        {summary ? (
          <div className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200">
            {summary}
          </div>
        ) : (
          <button 
            onClick={loadSummary}
            disabled={loading}
            className="w-full py-2 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 rounded text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <span className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></span> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate AI Summary
          </button>
        )}
      </div>
    </div>
  );
}
`,
  'src/App.tsx': `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClaimsExplorer from './pages/ClaimsExplorer';
import ClaimDetail from './pages/ClaimDetail';
import StateIntelligence from './pages/StateIntelligence';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/claims" element={<ClaimsExplorer />} />
          <Route path="/claims/:claimId" element={<ClaimDetail />} />
          <Route path="/states" element={<StateIntelligence />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
`,
  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`
};

for (const [relativePath, content] of Object.entries(files)) {
  const absPath = path.join(baseDir, relativePath);
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(absPath, content);
}
console.log('All files created successfully');
