import { DashboardData, PaginatedResponse, Claim, StateStats, FilterOptions, AIAnalysis, StateSummary } from '../types';

const API_BASE = '/api';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDashboard: () => fetcher<DashboardData>(`${API_BASE}/dashboard`),
  
  getClaims: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return fetcher<PaginatedResponse<Claim>>(`${API_BASE}/claims?${query}`);
  },
  
  getClaim: (id: string) => fetcher<Claim>(`${API_BASE}/claims/${id}`),
  
  getStates: () => fetcher<StateStats[]>(`${API_BASE}/states`),
  
  getStateDetail: (state: string) => fetcher<{state_stats: StateStats, districts: any[]}>(`${API_BASE}/states/${state}`),
  
  getAnomalies: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return fetcher<PaginatedResponse<Claim>>(`${API_BASE}/anomalies?${query}`);
  },
  
  getFilters: () => fetcher<FilterOptions>(`${API_BASE}/filters`),
  
  analyzeClaimAI: (claimId: string) => fetcher<AIAnalysis>(`${API_BASE}/ai/analyze-claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim_id: claimId })
  }),
  
  getStateSummary: (state: string) => fetcher<StateSummary>(`${API_BASE}/ai/state-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state })
  })
};
