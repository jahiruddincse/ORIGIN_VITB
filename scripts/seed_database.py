import json
import sqlite3
import datetime
import sys
from pathlib import Path

# Safe stdout for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def setup_database():
    db_path = Path(__file__).resolve().parent.parent / "backend" / "fra_monitor.db"

    # Remove existing DB for clean seed
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE claims (
        claim_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        claimant_name TEXT NOT NULL,
        claim_type TEXT NOT NULL,
        area_acres REAL NOT NULL,
        submission_date TEXT NOT NULL,
        approval_date TEXT,
        status TEXT NOT NULL,
        land_record_status TEXT NOT NULL,
        documents_complete BOOLEAN NOT NULL,
        recorded_area REAL,
        days_pending INTEGER NOT NULL DEFAULT 0,
        anomaly_score INTEGER NOT NULL DEFAULT 0,
        severity TEXT NOT NULL DEFAULT 'Normal',
        anomaly_types TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
    )
    ''')

    # Disposition audit trail table
    cursor.execute('''
    CREATE TABLE claim_dispositions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        officer_name TEXT NOT NULL,
        officer_designation TEXT NOT NULL,
        remarks TEXT,
        notice_ref_no TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (claim_id) REFERENCES claims(claim_id)
    )
    ''')

    # Official FRA benchmark reference layer
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS fra_official_benchmarks (
        state TEXT PRIMARY KEY,
        reporting_date TEXT NOT NULL,
        claims_received_individual INTEGER NOT NULL DEFAULT 0,
        claims_received_community INTEGER NOT NULL DEFAULT 0,
        claims_received_total INTEGER NOT NULL DEFAULT 0,
        titles_distributed_individual INTEGER NOT NULL DEFAULT 0,
        titles_distributed_community INTEGER NOT NULL DEFAULT 0,
        titles_distributed_total INTEGER NOT NULL DEFAULT 0,
        forest_land_extent_acres REAL NOT NULL DEFAULT 0.0,
        approval_rate_pct REAL NOT NULL DEFAULT 0.0,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_note TEXT NOT NULL
    )
    ''')

    # Create indexes
    cursor.execute("CREATE INDEX idx_state ON claims(state);")
    cursor.execute("CREATE INDEX idx_district ON claims(district);")
    cursor.execute("CREATE INDEX idx_status ON claims(status);")
    cursor.execute("CREATE INDEX idx_severity ON claims(severity);")
    cursor.execute("CREATE INDEX idx_anomaly_score ON claims(anomaly_score);")
    cursor.execute("CREATE INDEX idx_disp_claim ON claim_dispositions(claim_id);")

    # Read JSON data
    json_path = Path(__file__).resolve().parent / "claims_data.json"
    with open(json_path, "r", encoding="utf-8") as f:
        claims = json.load(f)

    # Insert data
    insert_query = '''
    INSERT INTO claims (
        claim_id, state, district, latitude, longitude, claimant_name,
        claim_type, area_acres, submission_date, approval_date, status,
        land_record_status, documents_complete, recorded_area, days_pending,
        anomaly_score, severity, anomaly_types, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    '''

    for c in claims:
        cursor.execute(insert_query, (
            c["claim_id"],
            c["state"],
            c["district"],
            c["latitude"],
            c["longitude"],
            c["claimant_name"],
            c["claim_type"],
            c["area_acres"],
            c["submission_date"],
            c.get("approval_date"),
            c["status"],
            c["land_record_status"],
            c["documents_complete"],
            c.get("recorded_area", c["area_acres"]),
            c.get("days_pending", 0),
            c.get("anomaly_score", 0),
            c.get("severity", "Normal"),
            json.dumps(c.get("anomaly_types", [])),
            c.get("created_at", datetime.datetime.now().isoformat()),
        ))

    # Add sample baseline audit trail for demo claims
    sample_dispositions = [
        ("DEMO-001", "GRAM_SABHA_PASSED", "Rajeshwar Tekam", "Gram Sabha Secretary", "Resolution No. 42/2023 passed unanimously. Title deed recommended.", "GS/MND/2023/114", "2023-11-15T10:30:00"),
        ("DEMO-001", "DLC_APPROVED", "Ananya Verma, IAS", "District Collector & DLC Chair", "Approved individual forest rights title under FRA Section 3(1)(a).", "DLC/MND/2024/08", "2024-02-20T14:15:00"),
        ("DEMO-002", "INSPECTION_SCHEDULED", "Manoj Uike", "Sub-Divisional Officer (SDLC)", "Physical beat inspection scheduled with Forest Range Officer.", "SDLC/BST/2024/29", "2024-01-10T11:00:00"),
        ("DEMO-003", "DISCREPANCY_FLAGGED", "Deepak Sharma", "Revenue Inspector (SDLC)", "Cadastral difference detected (8.5 ac claimed vs 3.2 ac recorded). Halting clearance.", "SDLC/SEO/2024/091", "2024-03-01T09:45:00")
    ]
    cursor.executemany('''
    INSERT INTO claim_dispositions (claim_id, action_type, officer_name, officer_designation, remarks, notice_ref_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', sample_dispositions)

    # Insert official government benchmarks
    benchmarks_data = [
        ('Madhya Pradesh', '2026-03-31', 737015, 29415, 766430, 231164, 29543, 260707, 1385200.0, 34.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Monthly Progress Report (MPR) tabled in Parliament. Includes Habitat Rights recognized for Baiga PVTG.'),
        ('Chhattisgarh', '2026-03-31', 864800, 57546, 922346, 479000, 55068, 534068, 3280500.0, 57.9, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Cumulative MPR. Highest CFR title distribution extent in Central India.'),
        ('Odisha', '2026-03-31', 715620, 17538, 733158, 456800, 7704, 464504, 1070400.0, 63.4, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Status Report. Highest title distribution rate among eastern tribal states.'),
        ('Maharashtra', '2026-03-31', 387000, 10897, 397897, 191800, 7867, 199667, 3120000.0, 50.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Significant Community Forest Rights recognized in Gadchiroli and Vidarbha.'),
        ('Andhra Pradesh', '2026-03-31', 279000, 9409, 288409, 220100, 8373, 228473, 960800.0, 79.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Summary. High disposal efficiency in Scheduled and Agency tracts.'),
        ('Gujarat', '2026-03-31', 182500, 7556, 190056, 98200, 5324, 103524, 1140000.0, 54.5, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA FRA Status Report. Concentrated in Dangs, Narmada, and Dahod tribal belts.'),
        ('Jharkhand', '2026-03-31', 106200, 4556, 110756, 59800, 2170, 61970, 250300.0, 56.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Primary coverage in Chota Nagpur and Santhal Pargana tribal regions.'),
        ('Rajasthan', '2026-03-31', 51000, 766, 51766, 51000, 766, 51766, 85000.0, 100.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Report. Covers TSP districts including Udaipur, Banswara, and Dungarpur.')
    ]
    cursor.executemany('''
    INSERT OR REPLACE INTO fra_official_benchmarks (
        state, reporting_date,
        claims_received_individual, claims_received_community, claims_received_total,
        titles_distributed_individual, titles_distributed_community, titles_distributed_total,
        forest_land_extent_acres, approval_rate_pct,
        source_name, source_url, source_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', benchmarks_data)

    conn.commit()

    # Print summary
    cursor.execute("SELECT COUNT(*) FROM claims")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM claims WHERE anomaly_score > 0")
    anomalous = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM claims WHERE severity IN ('High', 'Critical')")
    high_crit = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT state) FROM claims")
    states = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT district) FROM claims")
    districts = cursor.fetchone()[0]

    # Verify demo records
    for demo_id in ["DEMO-001", "DEMO-002", "DEMO-003"]:
        cursor.execute("SELECT claim_id, status, severity FROM claims WHERE claim_id = ?", (demo_id,))
        row = cursor.fetchone()
        if row:
            print(f"  [OK] {row[0]}: status={row[1]}, severity={row[2]}")
        else:
            print(f"  [FAIL] {demo_id}: MISSING!")

    print(f"\nSeeded {total} claims into {db_path}")
    print(f"  States: {states}, Districts: {districts}")
    print(f"  Anomalous: {anomalous}, High/Critical: {high_crit}")
    print(f"  Dispositions: {len(sample_dispositions)} audit records")
    print(f"  Official Benchmarks: {len(benchmarks_data)} MoTA state benchmarks")

    conn.close()

if __name__ == "__main__":
    setup_database()

