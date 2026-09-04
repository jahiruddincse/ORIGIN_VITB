-- VanRaksha AI — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Location: scripts/schema.sql

CREATE TABLE IF NOT EXISTS claims (
    claim_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    claimant_name TEXT NOT NULL,
    claim_type TEXT NOT NULL DEFAULT 'Individual',
    area_acres DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    claimed_area DOUBLE PRECISION GENERATED ALWAYS AS (area_acres) STORED,
    recorded_area DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'Pending',
    submission_date DATE NOT NULL,
    approval_date DATE,
    decision_date DATE GENERATED ALWAYS AS (approval_date) STORED,
    days_pending INTEGER NOT NULL DEFAULT 0,
    land_record_status TEXT NOT NULL DEFAULT 'Pending Verification',
    record_match TEXT GENERATED ALWAYS AS (land_record_status) STORED,
    documents_complete BOOLEAN NOT NULL DEFAULT true,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    anomaly_score INTEGER NOT NULL DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'Normal',
    anomaly_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_claims_state ON claims(state);
CREATE INDEX IF NOT EXISTS idx_claims_district ON claims(district);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_severity ON claims(severity);
CREATE INDEX IF NOT EXISTS idx_claims_anomaly_score ON claims(anomaly_score);
CREATE INDEX IF NOT EXISTS idx_claims_lat_lon ON claims(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_disp_claim_id ON claim_dispositions(claim_id);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read claims" ON claims;
CREATE POLICY "Allow anon read claims"
    ON claims
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon read dispositions" ON claim_dispositions;
CREATE POLICY "Allow anon read dispositions"
    ON claim_dispositions
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert dispositions" ON claim_dispositions;
CREATE POLICY "Allow anon insert dispositions"
    ON claim_dispositions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
