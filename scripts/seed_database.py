import json
import sqlite3
import datetime
from pathlib import Path

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
        days_pending INTEGER NOT NULL DEFAULT 0,
        anomaly_score INTEGER NOT NULL DEFAULT 0,
        severity TEXT NOT NULL DEFAULT 'Normal',
        anomaly_types TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
    )
    ''')

    # Create indexes
    cursor.execute("CREATE INDEX idx_state ON claims(state);")
    cursor.execute("CREATE INDEX idx_district ON claims(district);")
    cursor.execute("CREATE INDEX idx_status ON claims(status);")
    cursor.execute("CREATE INDEX idx_severity ON claims(severity);")
    cursor.execute("CREATE INDEX idx_anomaly_score ON claims(anomaly_score);")

    # Read JSON data
    json_path = Path(__file__).resolve().parent / "claims_data.json"
    with open(json_path, "r") as f:
        claims = json.load(f)

    # Insert data
    insert_query = '''
    INSERT INTO claims (
        claim_id, state, district, latitude, longitude, claimant_name,
        claim_type, area_acres, submission_date, approval_date, status,
        land_record_status, documents_complete, days_pending,
        anomaly_score, severity, anomaly_types, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            c.get("days_pending", 0),
            c.get("anomaly_score", 0),
            c.get("severity", "Normal"),
            json.dumps(c.get("anomaly_types", [])),
            c.get("created_at", datetime.datetime.now().isoformat()),
        ))

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
            print(f"  ✓ {row[0]}: status={row[1]}, severity={row[2]}")
        else:
            print(f"  ✗ {demo_id}: MISSING!")

    print(f"\nSeeded {total} claims into {db_path}")
    print(f"  States: {states}, Districts: {districts}")
    print(f"  Anomalous: {anomalous}, High/Critical: {high_crit}")

    conn.close()

if __name__ == "__main__":
    setup_database()
