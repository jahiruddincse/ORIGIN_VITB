import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Sparkles, AlertTriangle, ShieldCheck, Clock, MapPin, FileText, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Claim, AIAnalysis, parseAnomalyTypes } from '../types';
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
        const types = parseAnomalyTypes(claim.anomaly_types);
        setAiAnalysis({
          summary: `Automated fallback analysis based on rules. This claim exhibits ${types.length} flagged issues.`,
          why_flagged: types.map(t => t.replace(/_/g, ' ').toLowerCase()),
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

  const anomalyTypes = parseAnomalyTypes(claim.anomaly_types);

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
                className={`h-4 rounded-full ${claim.severity === 'Critical' ? 'bg-red-500' : claim.severity === 'High' ? 'bg-orange-500' : claim.severity === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`} 
                style={{ width: `${claim.anomaly_score}%` }}
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
                    {(Array.isArray(aiAnalysis.why_flagged) ? aiAnalysis.why_flagged : [aiAnalysis.why_flagged]).map((r, i) => <li key={i}>{r}</li>)}
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
