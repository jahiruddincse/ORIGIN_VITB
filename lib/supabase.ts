/**
 * Supabase Browser/Client-Side SDK
 * Strictly uses public/anon publishable key.
 * Never exposes service role key to client-side code.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export interface SupabaseClaim {
  claim_id: string;
  state: string;
  district: string;
  claimant_name: string;
  claim_type: string;
  area_acres: number;
  claimed_area?: number;
  recorded_area?: number;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Under Review';
  submission_date: string;
  approval_date?: string | null;
  decision_date?: string | null;
  days_pending: number;
  land_record_status: string;
  record_match?: string;
  documents_complete: boolean;
  latitude: number;
  longitude: number;
  anomaly_score: number;
  severity: 'Normal' | 'Low' | 'Medium' | 'High' | 'Critical';
  anomaly_types: string[] | string;
  created_at: string;
}
