import React, { useEffect, useState } from 'react';
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
        <KPICard title="Approval Rate" value={`${dash.approval_percentage.toFixed(1)}%`} icon={TrendingUp} />
        <KPICard title="Total Anomalies" value={dash.total_anomalies} icon={AlertTriangle} iconColor="text-orange-600" />
        <KPICard title="High Priority" value={dash.high_priority_anomalies} icon={AlertOctagon} iconColor="text-red-600" />
        <KPICard title="Avg Processing" value={`${Math.round(dash.avg_processing_days)}d`} icon={Calendar} iconColor="text-blue-600" />
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
                <Link key={claim.claim_id} to={`/claims/${claim.claim_id}`} className="block border border-slate-100 rounded-lg p-4 hover:bg-slate-50 transition-colors">
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
