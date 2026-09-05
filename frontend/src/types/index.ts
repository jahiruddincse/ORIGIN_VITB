export interface Claim {
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
  anomaly_types: string[] | string; // Backend returns parsed array, but handle string too
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
  anomalies: number;
  high_priority: number;
  approval_rate: number;
  risk_score: number;
  risk_level: 'Normal' | 'Low' | 'Medium' | 'High' | 'Critical';
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
  why_flagged: string[] | string;
  severity_assessment: string;
  recommended_action: string;
  evidence: Record<string, string> | string[];
  disclaimer: string;
}

export interface StateSummary {
  summary: string;
}

// Helper to parse anomaly_types whether it's a string or array
export function parseAnomalyTypes(val: string[] | string | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
