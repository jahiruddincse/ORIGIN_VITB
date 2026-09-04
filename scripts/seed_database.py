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

    conn.close()

if __name__ == "__main__":
    setup_database()

