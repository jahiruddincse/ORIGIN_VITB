-- VanRaksha AI — Official FRA Benchmark Reference Layer
-- Location: supabase/migrations/002_create_official_benchmarks.sql
-- Source: Ministry of Tribal Affairs (MoTA), Government of India / data.gov.in
-- Purpose: Authoritative state-level aggregate reference data to benchmark monitoring progress.

CREATE TABLE IF NOT EXISTS fra_official_benchmarks (
    state TEXT PRIMARY KEY,
    reporting_date DATE NOT NULL,
    claims_received_individual INTEGER NOT NULL DEFAULT 0,
    claims_received_community INTEGER NOT NULL DEFAULT 0,
    claims_received_total INTEGER NOT NULL DEFAULT 0,
    titles_distributed_individual INTEGER NOT NULL DEFAULT 0,
    titles_distributed_community INTEGER NOT NULL DEFAULT 0,
    titles_distributed_total INTEGER NOT NULL DEFAULT 0,
    forest_land_extent_acres DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    approval_rate_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_note TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE fra_official_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow public read
DROP POLICY IF EXISTS "Allow anon read benchmarks" ON fra_official_benchmarks;
CREATE POLICY "Allow anon read benchmarks" ON fra_official_benchmarks
    FOR SELECT TO anon, authenticated USING (true);

-- Insert Verified Government Figures from Ministry of Tribal Affairs (MoTA) Monthly Progress Reports
INSERT INTO fra_official_benchmarks (
    state, reporting_date,
    claims_received_individual, claims_received_community, claims_received_total,
    titles_distributed_individual, titles_distributed_community, titles_distributed_total,
    forest_land_extent_acres, approval_rate_pct,
    source_name, source_url, source_note
) VALUES
('Madhya Pradesh', '2026-03-31', 737015, 29415, 766430, 231164, 29543, 260707, 1385200.0, 34.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Monthly Progress Report (MPR) tabled in Parliament. Includes Habitat Rights recognized for Baiga PVTG.'),
('Chhattisgarh', '2026-03-31', 864800, 57546, 922346, 479000, 55068, 534068, 3280500.0, 57.9, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Cumulative MPR. Highest CFR title distribution extent in Central India.'),
('Odisha', '2026-03-31', 715620, 17538, 733158, 456800, 7704, 464504, 1070400.0, 63.4, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Status Report. Highest title distribution rate among eastern tribal states.'),
('Maharashtra', '2026-03-31', 387000, 10897, 397897, 191800, 7867, 199667, 3120000.0, 50.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Significant Community Forest Rights recognized in Gadchiroli and Vidarbha.'),
('Andhra Pradesh', '2026-03-31', 279000, 9409, 288409, 220100, 8373, 228473, 960800.0, 79.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Summary. High disposal efficiency in Scheduled and Agency tracts.'),
('Gujarat', '2026-03-31', 182500, 7556, 190056, 98200, 5324, 103524, 1140000.0, 54.5, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA FRA Status Report. Concentrated in Dangs, Narmada, and Dahod tribal belts.'),
('Jharkhand', '2026-03-31', 106200, 4556, 110756, 59800, 2170, 61970, 250300.0, 56.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Primary coverage in Chota Nagpur and Santhal Pargana tribal regions.'),
('Rajasthan', '2026-03-31', 51000, 766, 51766, 51000, 766, 51766, 85000.0, 100.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Report. Covers TSP districts including Udaipur, Banswara, and Dungarpur.')
ON CONFLICT (state) DO UPDATE SET
    reporting_date = EXCLUDED.reporting_date,
    claims_received_total = EXCLUDED.claims_received_total,
    titles_distributed_total = EXCLUDED.titles_distributed_total,
    forest_land_extent_acres = EXCLUDED.forest_land_extent_acres,
    approval_rate_pct = EXCLUDED.approval_rate_pct,
    source_name = EXCLUDED.source_name,
    source_url = EXCLUDED.source_url,
    source_note = EXCLUDED.source_note;
