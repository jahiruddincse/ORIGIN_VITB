-- VanRaksha AI — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Location: supabase/migrations/001_create_claims_schema.sql

-- 1. Create Claims Table (preserves existing field names while supporting canonical aliases)
CREATE TABLE IF NOT EXISTS claims (
    claim_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    claimant_name TEXT NOT NULL,
    claim_type TEXT NOT NULL DEFAULT 'Individual',
    
    -- Land Area: supports both area_acres (existing) and claimed_area (canonical alias)
    area_acres DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    claimed_area DOUBLE PRECISION GENERATED ALWAYS AS (area_acres) STORED,
    recorded_area DOUBLE PRECISION,
    
    -- Status & Lifecycle: supports both approval_date (existing) and decision_date (canonical alias)
    status TEXT NOT NULL DEFAULT 'Pending',
    submission_date DATE NOT NULL,
    approval_date DATE,
    decision_date DATE GENERATED ALWAYS AS (approval_date) STORED,
    days_pending INTEGER NOT NULL DEFAULT 0,
    
    -- Land Records & Verification: supports land_record_status (existing) and record_match (canonical alias)
    land_record_status TEXT NOT NULL DEFAULT 'Pending Verification',
    record_match TEXT GENERATED ALWAYS AS (land_record_status) STORED,
    documents_complete BOOLEAN NOT NULL DEFAULT true,
    
    -- Spatial Coordinates (for WebGIS / Leaflet rendering)
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Deterministic Anomaly Engine outputs
    anomaly_score INTEGER NOT NULL DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'Normal',
    anomaly_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Officer Audit Trail & Disposition Table
CREATE TABLE IF NOT EXISTS claim_dispositions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    officer_designation TEXT NOT NULL,
    remarks TEXT,
    notice_ref_no TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Performance Indexes for Fast WebGIS & Dashboard Filtering
CREATE INDEX IF NOT EXISTS idx_claims_state ON claims(state);
CREATE INDEX IF NOT EXISTS idx_claims_district ON claims(district);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_severity ON claims(severity);
CREATE INDEX IF NOT EXISTS idx_claims_anomaly_score ON claims(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_claims_lat_lon ON claims(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_disp_claim_id ON claim_dispositions(claim_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_dispositions ENABLE ROW LEVEL SECURITY;

-- 5. Minimum-Privilege RLS Policies for Public / Anon Key Access
-- Read-only access for all claims to power dashboard, WebGIS map, and filtering
DROP POLICY IF EXISTS "Allow anon read claims" ON claims;
CREATE POLICY "Allow anon read claims"
    ON claims
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Read access to official audit trail dispositions
DROP POLICY IF EXISTS "Allow anon read dispositions" ON claim_dispositions;
CREATE POLICY "Allow anon read dispositions"
    ON claim_dispositions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Insert access for officers recording statutory dispositions
DROP POLICY IF EXISTS "Allow anon insert dispositions" ON claim_dispositions;
CREATE POLICY "Allow anon insert dispositions"
    ON claim_dispositions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
