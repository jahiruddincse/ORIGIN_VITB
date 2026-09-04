import React, { useEffect, useState } from 'react';
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
            <div className="text-xl font-semibold text-blue-600">{state.high_priority}</div>          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-600 font-medium">Approved ({state.approved})</span>
            <span className="text-amber-600 font-medium">Pending ({state.pending})</span>
            <span className="text-red-600 font-medium">Rejected ({state.rejected})</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${(state.approved/state.total)*100}%` }}></div>
            <div className="bg-amber-400 h-full" style={{ width: `${(state.pending/state.total)*100}%` }}></div>
            <div className="bg-red-500 h-full" style={{ width: `${(state.rejected/state.total)*100}%` }}></div>
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
