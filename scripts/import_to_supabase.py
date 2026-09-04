#!/usr/bin/env python3
"""
VanRaksha AI — Supabase Data Importer
Imports the exact 750 FRA claims dataset from SQLite/JSON into Supabase PostgreSQL.
Preserves all claim IDs, geographic coordinates, submission dates, approval dates,
land records, and deterministic anomaly engine scores/types.
"""

import os
import sys
import json
import sqlite3
import urllib.request
import ssl
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment files
for env_file in [BASE_DIR / ".env.local", BASE_DIR / ".env"]:
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def load_claims_from_db():
    db_path = BASE_DIR / "backend" / "fra_monitor.db"
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM claims ORDER BY claim_id")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        for r in rows:
            if isinstance(r.get("anomaly_types"), str):
                try:
                    r["anomaly_types"] = json.loads(r["anomaly_types"])
                except Exception:
                    r["anomaly_types"] = []
        return rows

    # Fallback to JSON
    json_path = BASE_DIR / "claims_data.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    raise FileNotFoundError("Could not find fra_monitor.db or claims_data.json")

def import_to_supabase():
    print("=" * 60)
    print("  VANRAKSHA AI — SUPABASE CLAIMS DATA IMPORTER")
    print("=" * 60)

    if not SUPABASE_URL:
        print("❌ Error: NEXT_PUBLIC_SUPABASE_URL is not set.")
        sys.exit(1)

    if not SUPABASE_KEY:
        print("⚠️ Warning: No Supabase API Key found in .env.local or process environment.")
        print(f"Target URL: {SUPABASE_URL}")
        print("Please set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        print("\nAlternatively, you can copy the generated SQL file:")
        print(f"  --> {BASE_DIR / 'supabase' / 'seed_supabase.sql'}")
        print("and execute it directly in the Supabase SQL Editor.")
        sys.exit(2)

    claims = load_claims_from_db()
    print(f"Loaded {len(claims)} claims from local data source.")
    print(f"Target Supabase Endpoint: {SUPABASE_URL}/rest/v1/claims")

    endpoint = f"{SUPABASE_URL}/rest/v1/claims"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    ssl_ctx = ssl._create_unverified_context()

    # Batch insert in chunks of 50
    batch_size = 50
    total_imported = 0

    for i in range(0, len(claims), batch_size):
        chunk = claims[i:i + batch_size]
        payload = []
        for c in chunk:
            payload.append({
                "claim_id": c["claim_id"],
                "state": c["state"],
                "district": c["district"],
                "claimant_name": c["claimant_name"],
                "claim_type": c.get("claim_type", "Individual"),
                "area_acres": c.get("area_acres", 0.0),
                "recorded_area": c.get("recorded_area"),
                "status": c.get("status", "Pending"),
                "submission_date": c.get("submission_date"),
                "approval_date": c.get("approval_date"),
                "days_pending": c.get("days_pending", 0),
                "land_record_status": c.get("land_record_status", "Pending Verification"),
                "documents_complete": bool(c.get("documents_complete")),
                "latitude": c.get("latitude", 0.0),
                "longitude": c.get("longitude", 0.0),
                "anomaly_score": c.get("anomaly_score", 0),
                "severity": c.get("severity", "Normal"),
                "anomaly_types": c.get("anomaly_types", []),
                "created_at": c.get("created_at")
            })

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                if resp.status in (200, 201):
                    total_imported += len(chunk)
                    print(f"  ✓ Imported batch {i // batch_size + 1}: claims {i + 1} to {min(i + batch_size, len(claims))}")
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8', errors='ignore')
            print(f"❌ Batch {i // batch_size + 1} failed: HTTP {e.code} — {err_msg}")
            if e.code == 401:
                print("Hint: Check that your publishable key or service role key has insert permissions via RLS.")
            break
        except Exception as e:
            print(f"❌ Connection error: {e}")
            break

    print("-" * 60)
    print(f"Total claims successfully imported: {total_imported} / {len(claims)}")
    if total_imported == len(claims):
        print("🎉 Full FRA claims dataset successfully migrated to Supabase!")

if __name__ == "__main__":
    import_to_supabase()
