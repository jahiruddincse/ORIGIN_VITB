"""
VanRaksha AI — Forest Rights Act (FRA) Monitoring Backend Server
Pure Python 3 standard library implementation of all REST API endpoints.
Runs with zero external pip dependencies and connects directly to fra_monitor.db.
Also supports FastAPI if installed.
"""

import http.server
import json
import os
import sqlite3
import sys
import urllib.parse
import urllib.request
import ssl
from pathlib import Path
import datetime
import math
import hashlib

# Safe stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Database & Env setup
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fra_monitor.db"

# Load .env.local and .env files if present
for ep in [BASE_DIR / ".env.local", BASE_DIR.parent / ".env.local", BASE_DIR / ".env", BASE_DIR.parent / ".env"]:
    if ep.exists():
        try:
            with open(ep, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception:
            pass

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", os.environ.get("LLM_API_KEY", ""))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or ""
)

# Gazetted Protected Forest Areas (Centroids in Central/Eastern/Western India)
PROTECTED_FOREST_AREAS = [
    {"name": "Pench Tiger Reserve (MP)", "lat": 21.67, "lon": 79.30, "type": "Critical Tiger Habitat"},
    {"name": "Kanha National Park (Mandla)", "lat": 22.33, "lon": 80.61, "type": "National Park & Tiger Reserve"},
    {"name": "Satpura Tiger Reserve (Hoshangabad)", "lat": 22.48, "lon": 78.43, "type": "Tiger Reserve Core"},
    {"name": "Kanger Ghati National Park (Bastar)", "lat": 18.87, "lon": 81.87, "type": "National Park & Biosphere"},
    {"name": "Similipal Tiger Reserve (Mayurbhanj)", "lat": 21.93, "lon": 86.34, "type": "Biosphere Reserve & CTH"},
    {"name": "Achanakmar Tiger Reserve (Bilaspur)", "lat": 22.50, "lon": 81.75, "type": "Critical Tiger Habitat"},
    {"name": "Bandhavgarh National Park (Umaria)", "lat": 23.70, "lon": 81.03, "type": "National Park Core"},
    {"name": "Gir National Park & Sanctuary (Junagadh)", "lat": 21.12, "lon": 70.82, "type": "National Park & Wildlife Sanctuary"},
    {"name": "Tadoba Andhari Tiger Reserve (Chandrapur)", "lat": 20.24, "lon": 79.30, "type": "Tiger Reserve Core"},
]

def calculate_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def get_nearest_protected_area(lat, lon):
    if not lat or not lon:
        return None
    closest = None
    min_dist = float('inf')
    for pa in PROTECTED_FOREST_AREAS:
        d = calculate_distance_km(lat, lon, pa["lat"], pa["lon"])
        if d < min_dist:
            min_dist = d
            closest = {**pa, "distance_km": d}

    if min_dist < 2.0:
        closest["buffer_status"] = "Critical Core Zone (<2km)"
        closest["conflict_severity"] = "Critical"
    elif min_dist < 10.0:
        closest["buffer_status"] = "Eco-Sensitive Buffer Zone (<10km)"
        closest["conflict_severity"] = "High"
    elif min_dist < 25.0:
        closest["buffer_status"] = "Wildlife Corridor Influence (<25km)"
        closest["conflict_severity"] = "Medium"
    else:
        closest["buffer_status"] = "Standard Revenue/Forest Beat (>25km)"
        closest["conflict_severity"] = "Normal"
    return closest

def get_temporal_satellite_data(claim_id, anomaly_score, area_acres):
    if claim_id == "DEMO-001":
        return {
            "cutoff_year_2005": {"year": 2005, "ndvi": 0.28, "canopy_density_pct": 22, "classification": "Cultivated / Settled Plot"},
            "midterm_year_2015": {"year": 2015, "ndvi": 0.31, "canopy_density_pct": 24, "classification": "Stabilized Agriculture"},
            "present_year_2024": {"year": 2024, "ndvi": 0.30, "canopy_density_pct": 23, "classification": "Active Agricultural Parcel"},
            "verdict": "Pre-2005 Cultivation Corroborated",
            "details": "Historical Landsat spectral index (NDVI: 0.28) indicates open agricultural clearing prior to Dec 13, 2005 cut-off. Fully compliant with Section 4(3) statutory criteria.",
            "fra_cutoff_compliant": True,
            "canopy_loss_pct": 0
        }
    elif claim_id == "DEMO-002":
        return {
            "cutoff_year_2005": {"year": 2005, "ndvi": 0.36, "canopy_density_pct": 32, "classification": "Low-Density Agroforestry"},
            "midterm_year_2015": {"year": 2015, "ndvi": 0.34, "canopy_density_pct": 30, "classification": "Settled Forest Dwelling"},
            "present_year_2024": {"year": 2024, "ndvi": 0.33, "canopy_density_pct": 28, "classification": "Active Traditional Holding"},
            "verdict": "Pre-2005 Traditional Occupation Validated",
            "details": "Stable multi-decadal vegetation signature confirms long-standing traditional forest habitation pre-dating the 2005 threshold.",
            "fra_cutoff_compliant": True,
            "canopy_loss_pct": 4
        }
    elif claim_id == "DEMO-003":
        return {
            "cutoff_year_2005": {"year": 2005, "ndvi": 0.74, "canopy_density_pct": 81, "classification": "Dense Intact Forest Canopy"},
            "midterm_year_2015": {"year": 2015, "ndvi": 0.65, "canopy_density_pct": 68, "classification": "Initial Canopy Fragmentation"},
            "present_year_2024": {"year": 2024, "ndvi": 0.32, "canopy_density_pct": 27, "classification": "Recent Forest Clearing"},
            "verdict": "High Risk: Post-2005 Forest Clearing Detected",
            "details": "Spectral time-series confirms intact closed-canopy forest (NDVI 0.74, 81% canopy) as of December 2005. Deforestation occurred between 2015 and 2021. SDLC joint verification mandated.",
            "fra_cutoff_compliant": False,
            "canopy_loss_pct": 54
        }

    # Deterministic fallback based on claim_id
    h = int(hashlib.md5(claim_id.encode()).hexdigest(), 16)
    is_suspect = anomaly_score >= 60 or (h % 5 == 0)
    if is_suspect:
        ndvi_05 = round(0.65 + (h % 15) * 0.01, 2)
        canopy_05 = int(ndvi_05 * 105)
        ndvi_15 = round(ndvi_05 - 0.12, 2)
        canopy_15 = int(canopy_05 - 15)
        ndvi_24 = round(0.28 + (h % 10) * 0.01, 2)
        canopy_24 = int(ndvi_24 * 90)
        loss = canopy_05 - canopy_24
        return {
            "cutoff_year_2005": {"year": 2005, "ndvi": ndvi_05, "canopy_density_pct": canopy_05, "classification": "Dense Forest Canopy"},
            "midterm_year_2015": {"year": 2015, "ndvi": ndvi_15, "canopy_density_pct": canopy_15, "classification": "Canopy Disturbance"},
            "present_year_2024": {"year": 2024, "ndvi": ndvi_24, "canopy_density_pct": canopy_24, "classification": "Cleared Plot"},
            "verdict": "Potential Post-2005 Clearing Detected",
            "details": f"Canopy loss of {loss}% detected after statutory 2005 baseline. Review ground survey records.",
            "fra_cutoff_compliant": False,
            "canopy_loss_pct": loss
        }
    else:
        ndvi_05 = round(0.26 + (h % 12) * 0.01, 2)
        canopy_05 = int(ndvi_05 * 90)
        ndvi_15 = round(ndvi_05 + 0.03, 2)
        canopy_15 = int(canopy_05 + 3)
        ndvi_24 = round(ndvi_05 + 0.02, 2)
        canopy_24 = canopy_05
        return {
            "cutoff_year_2005": {"year": 2005, "ndvi": ndvi_05, "canopy_density_pct": canopy_05, "classification": "Pre-2005 Cleared / Settlement"},
            "midterm_year_2015": {"year": 2015, "ndvi": ndvi_15, "canopy_density_pct": canopy_15, "classification": "Cultivated Parcel"},
            "present_year_2024": {"year": 2024, "ndvi": ndvi_24, "canopy_density_pct": canopy_24, "classification": "Traditional Cultivation"},
            "verdict": "Pre-2005 Cultivation Corroborated",
            "details": "Consistent agricultural vegetation signature verified prior to December 13, 2005 cut-off.",
            "fra_cutoff_compliant": True,
            "canopy_loss_pct": 0
        }


sys.path.insert(0, str(BASE_DIR))
try:
    from app.services.statistics import StatisticsService
    HAS_APP_SERVICES = True
except ImportError:
    HAS_APP_SERVICES = False

try:
    from app.supabase_client import SupabaseService
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

OFFICIAL_MOTA_BENCHMARKS = [
    ('Madhya Pradesh', '2026-03-31', 737015, 29415, 766430, 231164, 29543, 260707, 1385200.0, 34.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Monthly Progress Report (MPR) tabled in Parliament. Includes Habitat Rights recognized for Baiga PVTG.'),
    ('Chhattisgarh', '2026-03-31', 864800, 57546, 922346, 479000, 55068, 534068, 3280500.0, 57.9, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official Cumulative MPR. Highest CFR title distribution extent in Central India.'),
    ('Odisha', '2026-03-31', 715620, 17538, 733158, 456800, 7704, 464504, 1070400.0, 63.4, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Status Report. Highest title distribution rate among eastern tribal states.'),
    ('Maharashtra', '2026-03-31', 387000, 10897, 397897, 191800, 7867, 199667, 3120000.0, 50.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Significant Community Forest Rights recognized in Gadchiroli and Vidarbha.'),
    ('Andhra Pradesh', '2026-03-31', 279000, 9409, 288409, 220100, 8373, 228473, 960800.0, 79.2, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Summary. High disposal efficiency in Scheduled and Agency tracts.'),
    ('Gujarat', '2026-03-31', 182500, 7556, 190056, 98200, 5324, 103524, 1140000.0, 54.5, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA FRA Status Report. Concentrated in Dangs, Narmada, and Dahod tribal belts.'),
    ('Jharkhand', '2026-03-31', 106200, 4556, 110756, 59800, 2170, 61970, 250300.0, 56.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA MPR. Primary coverage in Chota Nagpur and Santhal Pargana tribal regions.'),
    ('Rajasthan', '2026-03-31', 51000, 766, 51766, 51000, 766, 51766, 85000.0, 100.0, 'Ministry of Tribal Affairs (MoTA), Govt of India', 'https://tribal.nic.in/FRA.aspx', 'Official MoTA Progress Report. Covers TSP districts including Udaipur, Banswara, and Dungarpur.')
]

def ensure_benchmarks_table():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
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
        c.execute("SELECT COUNT(*) FROM fra_official_benchmarks")
        if c.fetchone()[0] == 0:
            c.executemany('''
            INSERT OR REPLACE INTO fra_official_benchmarks (
                state, reporting_date,
                claims_received_individual, claims_received_community, claims_received_total,
                titles_distributed_individual, titles_distributed_community, titles_distributed_total,
                forest_land_extent_acres, approval_rate_pct,
                source_name, source_url, source_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', OFFICIAL_MOTA_BENCHMARKS)
            conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error ensuring benchmarks table: {e}")

ensure_benchmarks_table()


class FRAServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Single-value query param helper
        def qp(key, default=None):
            vals = query_params.get(key)
            return vals[0] if vals else default

        # Health check
        if path == '/api/health':
            return self.send_json({"status": "ok", "timestamp": datetime.datetime.now().isoformat()})

        # Database connection & Supabase status
        if path == '/api/database/status':
            if HAS_SUPABASE:
                return self.send_json(SupabaseService.get_status(fallback_count=750))
            return self.send_json({"source": "sqlite_fallback", "supabase_configured": False, "status": "unconfigured", "claims_count": 750})

        # Dashboard KPIs & stats
        if path == '/api/dashboard':
            if HAS_APP_SERVICES:
                conn = get_db()
                payload = StatisticsService.get_dashboard_stats(conn)
                conn.close()
                return self.send_json(payload)

            conn = get_db()
            c = conn.cursor()
            
            c.execute("SELECT COUNT(*) as total FROM claims")
            total_claims = c.fetchone()["total"]

            c.execute("SELECT status, COUNT(*) as count FROM claims GROUP BY status")
            status_counts = {row["status"]: row["count"] for row in c.fetchall()}
            approved = status_counts.get("Approved", 0)
            pending = status_counts.get("Pending", 0)
            rejected = status_counts.get("Rejected", 0)
            under_review = status_counts.get("Under Review", 0)
            approval_percentage = round((approved / total_claims) * 100, 1) if total_claims > 0 else 0

            c.execute("SELECT COUNT(*) as total FROM claims WHERE anomaly_score > 0")
            total_anomalies = c.fetchone()["total"]

            c.execute("SELECT COUNT(*) as total FROM claims WHERE severity IN ('High', 'Critical')")
            high_priority_anomalies = c.fetchone()["total"]

            c.execute('''
                SELECT AVG(julianday(approval_date) - julianday(submission_date)) as avg_days
                FROM claims
                WHERE status = 'Approved' AND approval_date IS NOT NULL
            ''')
            row = c.fetchone()
            avg_processing_days = round(row["avg_days"]) if row and row["avg_days"] else 0

            c.execute("SELECT * FROM claims WHERE anomaly_score > 0 ORDER BY anomaly_score DESC LIMIT 10")
            recent_anomalies = []
            for r in c.fetchall():
                d = dict(r)
                try:
                    d["anomaly_types"] = json.loads(d["anomaly_types"])
                except Exception:
                    pass
                recent_anomalies.append(d)

            conn.close()
            return self.send_json({
                "total_claims": total_claims,
                "approved": approved,
                "pending": pending,
                "rejected": rejected,
                "under_review": under_review,
                "approval_percentage": approval_percentage,
                "total_anomalies": total_anomalies,
                "high_priority_anomalies": high_priority_anomalies,
                "avg_processing_days": avg_processing_days,
                "recent_anomalies": recent_anomalies,
                "priority_districts": [],
                "state_summary": [],
                "data_provenance": {
                    "claim_records_type": "SYNTHETIC",
                    "claim_records_count": total_claims,
                    "claim_records_note": "Claim-level records (750 claims) shown in this WebGIS interface are synthetic demonstration data generated for hackathon evaluation and spatial anomaly analysis.",
                    "official_benchmark_source": "Ministry of Tribal Affairs (MoTA), Government of India",
                    "official_benchmark_url": "https://tribal.nic.in/FRA.aspx",
                    "official_benchmark_reporting_date": "2026-03-31",
                    "disclaimer": "Claim-level records shown in this hackathon demo are synthetic. Official FRA aggregate statistics are used only as reference benchmarks."
                }
            })

        # District GeoJSON for map choropleth
        if path == '/api/map/districts':
            if HAS_APP_SERVICES:
                conn = get_db()
                payload = StatisticsService.get_district_geojson(conn)
                conn.close()
                return self.send_json(payload)
            return self.send_json({"type": "FeatureCollection", "features": []})

        # Priority districts list
        if path == '/api/priority-districts':
            limit = int(qp('limit', 8))
            if HAS_APP_SERVICES:
                conn = get_db()
                payload = StatisticsService.get_priority_districts(conn, limit)
                conn.close()
                return self.send_json(payload)
            return self.send_json([])

        # Official MoTA aggregate benchmarks
        if path == '/api/benchmarks':
            # Attempt Supabase first if configured
            if HAS_SUPABASE and SupabaseService.is_configured():
                sb_benchmarks = SupabaseService.fetch_benchmarks()
                if sb_benchmarks and len(sb_benchmarks) > 0:
                    total_claims = sum(b.get("claims_received_total", 0) for b in sb_benchmarks)
                    total_titles = sum(b.get("titles_distributed_total", 0) for b in sb_benchmarks)
                    total_acres = sum(b.get("forest_land_extent_acres", 0.0) for b in sb_benchmarks)
                    avg_rate = round((total_titles / total_claims * 100), 1) if total_claims else 0.0
                    return self.send_json({
                        "source": "Ministry of Tribal Affairs (MoTA), Government of India",
                        "source_url": "https://tribal.nic.in/FRA.aspx",
                        "reporting_date": "2026-03-31",
                        "data_provenance": "OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)",
                        "national_summary": {
                            "states_covered": len(sb_benchmarks),
                            "total_claims_received": total_claims,
                            "total_titles_distributed": total_titles,
                            "total_forest_land_extent_acres": total_acres,
                            "overall_title_distribution_rate_pct": avg_rate
                        },
                        "states": sb_benchmarks
                    })

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM fra_official_benchmarks ORDER BY claims_received_total DESC")
            rows = [dict(r) for r in c.fetchall()]
            conn.close()

            total_claims = sum(b.get("claims_received_total", 0) for b in rows)
            total_titles = sum(b.get("titles_distributed_total", 0) for b in rows)
            total_acres = sum(b.get("forest_land_extent_acres", 0.0) for b in rows)
            avg_rate = round((total_titles / total_claims * 100), 1) if total_claims else 0.0

            return self.send_json({
                "source": "Ministry of Tribal Affairs (MoTA), Government of India",
                "source_url": "https://tribal.nic.in/FRA.aspx",
                "reporting_date": "2026-03-31",
                "data_provenance": "OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)",
                "national_summary": {
                    "states_covered": len(rows),
                    "total_claims_received": total_claims,
                    "total_titles_distributed": total_titles,
                    "total_forest_land_extent_acres": total_acres,
                    "overall_title_distribution_rate_pct": avg_rate
                },
                "states": rows
            })

        if path.startswith('/api/benchmarks/'):
            state_name = urllib.parse.unquote(path[len('/api/benchmarks/'):])
            if HAS_SUPABASE and SupabaseService.is_configured():
                sb_benchmarks = SupabaseService.fetch_benchmarks(state=state_name)
                if sb_benchmarks and len(sb_benchmarks) > 0:
                    res = sb_benchmarks[0]
                    res["data_provenance"] = "OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)"
                    return self.send_json(res)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM fra_official_benchmarks WHERE state = ?", (state_name,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"detail": f"Official benchmark not found for state: {state_name}"}, 404)
            res = dict(row)
            res["data_provenance"] = "OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)"
            return self.send_json(res)

        # States summary list
        if path == '/api/states':
            conn = get_db()
            c = conn.cursor()
            c.execute('''
                SELECT 
                    state,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies,
                    SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
                FROM claims
                GROUP BY state
                ORDER BY total DESC
            ''')

            rows = []

            for r in c.fetchall():
                d = dict(r)
                total = d["total"]

                anomaly_rate = (d["anomalies"] / total) * 100 if total > 0 else 0
                high_priority_rate = (d["high_priority"] / total) * 100 if total > 0 else 0
                pending_rate = (d["pending"] / total) * 100 if total > 0 else 0

                d["approval_rate"] = round(
                    (d["approved"] / total) * 100, 1
                ) if total > 0 else 0

                anomaly_points = min(anomaly_rate * 0.40, 40)
                priority_points = min(high_priority_rate * 0.30, 30)
                pending_points = min(pending_rate * 0.20, 20)
                approval_points = min((100 - d["approval_rate"]) * 0.10, 10)

                d["risk_score"] = round(
                    anomaly_points +
                    priority_points +
                    pending_points +
                    approval_points
                )

                if d["risk_score"] >= 80:
                    d["risk_level"] = "Critical"
                elif d["risk_score"] >= 60:
                    d["risk_level"] = "High"
                elif d["risk_score"] >= 40:
                    d["risk_level"] = "Medium"
                elif d["risk_score"] >= 20:
                    d["risk_level"] = "Low"
                else:
                    d["risk_level"] = "Normal"

                rows.append(d)

            conn.close()
            return self.send_json(rows)

        # State detail
        if path.startswith('/api/states/'):
            state_name = urllib.parse.unquote(path[len('/api/states/'):])
            conn = get_db()
            c = conn.cursor()

            c.execute('''
                SELECT 
                    district,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies,
                    SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
                FROM claims
                WHERE state = ?
                GROUP BY district
                ORDER BY total DESC
            ''', (state_name,))

            districts = [dict(r) for r in c.fetchall()]

            if not districts:
                conn.close()
                return self.send_json({"detail": "State not found"}, 404)

            c.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies,
                    SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
                FROM claims
                WHERE state = ?
            ''', (state_name,))

            state_stats = dict(c.fetchone())
            state_stats["state"] = state_name
            state_stats["approval_rate"] = round((state_stats["approved"] / state_stats["total"]) * 100, 1) if state_stats["total"] > 0 else 0

            # Fetch official MoTA aggregate benchmark for this state
            c.execute("SELECT * FROM fra_official_benchmarks WHERE state = ?", (state_name,))
            bm_row = c.fetchone()
            official_benchmark = dict(bm_row) if bm_row else None

            conn.close()

            return self.send_json({
                "state": state_name,
                "state_stats": state_stats,
                "total_claims": state_stats["total"],
                "districts": districts,
                "official_benchmark": official_benchmark,
                "data_provenance": {
                    "sample_records": "SYNTHETIC DEMO SAMPLE (For district GIS mapping & anomaly detection)",
                    "official_benchmark": "OFFICIAL MOTA AGGREGATE (Ground truth reference)",
                    "source": "Ministry of Tribal Affairs (MoTA), Government of India"
                }
            })

        # District detail
        if path.startswith('/api/districts/'):
            district_name = urllib.parse.unquote(path[len('/api/districts/'):])
            conn = get_db()
            c = conn.cursor()

            c.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies,
                    SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
                FROM claims
                WHERE district = ?
            ''', (district_name,))

            stats = dict(c.fetchone())
            conn.close()

            if stats["total"] == 0:
                return self.send_json({"detail": "District not found"}, 404)

            return self.send_json({
                "district": district_name,
                "stats": stats
            })

        # Claims list with filters & pagination
        if path == '/api/claims':
            state = qp('state')
            district = qp('district')
            status = qp('status')
            severity = qp('severity')
            anomaly_type = qp('anomaly_type')
            search = qp('search')
            page = int(qp('page', 1))
            limit = int(qp('limit', 20))
            offset = (page - 1) * limit

            # Attempt Supabase data retrieval if configured
            if HAS_SUPABASE and SupabaseService.is_configured():
                sb_res = SupabaseService.fetch_claims(
                    state=state,
                    district=district,
                    status=status,
                    severity=severity,
                    anomaly_type=anomaly_type,
                    search=search,
                    limit=limit,
                    offset=offset
                )
                if sb_res and sb_res.get("data") and len(sb_res["data"]) > 0:
                    sb_res["source"] = "supabase"
                    sb_res["data_provenance"] = "DEMO DATASET — SYNTHETIC CLAIM-LEVEL RECORDS"
                    return self.send_json(sb_res)

            query = "SELECT * FROM claims WHERE 1=1"
            count_query = "SELECT COUNT(*) as total FROM claims WHERE 1=1"
            params = []

            if state:
                query += " AND state = ?"
                count_query += " AND state = ?"
                params.append(state)
            if district:
                query += " AND district = ?"
                count_query += " AND district = ?"
                params.append(district)
            if status:
                query += " AND status = ?"
                count_query += " AND status = ?"
                params.append(status)
            if severity:
                query += " AND severity = ?"
                count_query += " AND severity = ?"
                params.append(severity)
            if anomaly_type:
                query += " AND anomaly_types LIKE ?"
                count_query += " AND anomaly_types LIKE ?"
                params.append(f"%{anomaly_type}%")
            if search:
                query += " AND (claimant_name LIKE ? OR claim_id LIKE ? OR district LIKE ?)"
                count_query += " AND (claimant_name LIKE ? OR claim_id LIKE ? OR district LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

            conn = get_db()
            c = conn.cursor()
            c.execute(count_query, params)
            total = c.fetchone()["total"]

            # Sort by anomaly score desc then submission date
            offset = (page - 1) * limit
            query += " ORDER BY anomaly_score DESC, submission_date DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            c.execute(query, params)
            rows = []
            for r in c.fetchall():
                d = dict(r)
                try:
                    d["anomaly_types"] = json.loads(d["anomaly_types"])
                except Exception:
                    pass
                d["data_provenance"] = "DEMO DATASET — SYNTHETIC RECORD"
                rows.append(d)
            conn.close()

            pages = (total + limit - 1) // limit if total > 0 else 1
            return self.send_json({
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "data_provenance": "DEMO DATASET — SYNTHETIC CLAIM-LEVEL RECORDS",
                "data": rows
            })

        # Spatial analysis & temporal NDVI for claim
        if path.startswith('/api/claims/') and path.endswith('/spatial-analysis'):
            claim_id = path[len('/api/claims/'):-len('/spatial-analysis')]
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"detail": "Claim not found"}, 404)
            claim = dict(row)
            lat = claim.get("latitude")
            lon = claim.get("longitude")
            nearest_pa = get_nearest_protected_area(lat, lon)
            temporal = get_temporal_satellite_data(claim_id, claim.get("anomaly_score", 0), claim.get("area_acres", 0))
            return self.send_json({
                "claim_id": claim_id,
                "claimant_name": claim.get("claimant_name"),
                "coordinates": {"lat": lat, "lon": lon},
                "nearest_protected_area": nearest_pa,
                "temporal_satellite_analysis": temporal,
                "pre_2005_compliant": temporal.get("fra_cutoff_compliant", True),
                "data_provenance": "DEMO DATASET — SYNTHETIC RECORD (Simulation)"
            })

        # Claim audit trail / dispositions
        if path.startswith('/api/claims/') and path.endswith('/audit-trail'):
            claim_id = path[len('/api/claims/'):-len('/audit-trail')]
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM claim_dispositions WHERE claim_id = ? ORDER BY created_at DESC", (claim_id,))
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({
                "claim_id": claim_id,
                "total_actions": len(rows),
                "dispositions": rows
            })

        # Single claim detail
        if path.startswith('/api/claims/'):
            claim_id = path[len('/api/claims/'):]
            if HAS_SUPABASE and SupabaseService.is_configured():
                sb_claim = SupabaseService.fetch_claim_by_id(claim_id)
                if sb_claim:
                    sb_claim["source"] = "supabase"
                    sb_claim["data_provenance"] = "DEMO DATASET — SYNTHETIC RECORD"
                    return self.send_json(sb_claim)

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"detail": "Claim not found"}, 404)
            d = dict(row)
            try:
                d["anomaly_types"] = json.loads(d["anomaly_types"])
            except Exception:
                pass
            d["data_provenance"] = "DEMO DATASET — SYNTHETIC RECORD"
            return self.send_json(d)

        # Anomalies list
        if path == '/api/anomalies':
            limit = int(qp('limit', 50))
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM claims WHERE anomaly_score > 0 ORDER BY anomaly_score DESC LIMIT ?", (limit,))
            rows = []
            for r in c.fetchall():
                d = dict(r)
                try:
                    d["anomaly_types"] = json.loads(d["anomaly_types"])
                except Exception:
                    pass
                rows.append(d)
            conn.close()
            return self.send_json({"total": len(rows), "data": rows})

        # Anomaly detail by claim_id
        if path.startswith('/api/anomalies/'):
            claim_id = path[len('/api/anomalies/'):]
            if HAS_APP_SERVICES:
                conn = get_db()
                evidence_payload = StatisticsService.get_claim_evidence(conn, claim_id)
                if not evidence_payload:
                    conn.close()
                    return self.send_json({"detail": "Claim not found"}, 404)
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
                row = dict(cursor.fetchone())
                conn.close()
                row["anomaly_types"] = json.loads(row["anomaly_types"])
                return self.send_json({
                    "claim_id": claim_id,
                    "has_anomaly": evidence_payload["has_anomaly"],
                    "score": evidence_payload["score"],
                    "severity": evidence_payload["severity"],
                    "types": evidence_payload["types"],
                    "claim_details": row,
                    "evidence": evidence_payload["evidence"],
                    "district_context": evidence_payload["district_context"],
                    "state_context": evidence_payload["state_context"],
                    "score_breakdown": evidence_payload["score_breakdown"],
                })

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
            row = c.fetchone()
            conn.close()
            if not row:
                return self.send_json({"detail": "Claim not found"}, 404)
            d = dict(row)
            try:
                d["anomaly_types"] = json.loads(d["anomaly_types"])
            except Exception:
                pass
            return self.send_json({
                "claim_id": claim_id,
                "has_anomaly": d["anomaly_score"] > 0,
                "score": d["anomaly_score"],
                "severity": d["severity"],
                "types": d["anomaly_types"],
                "claim_details": d
            })

        # State analytics for charts
        if path == '/api/analytics/state':
            conn = get_db()
            c = conn.cursor()
            c.execute('''
                SELECT 
                    state, 
                    COUNT(*) as total_claims,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_claims,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_claims,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_claims
                FROM claims
                GROUP BY state
                ORDER BY total_claims DESC
            ''')
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return self.send_json({
                "labels": [r["state"] for r in rows],
                "datasets": [
                    {"label": "Total Claims", "data": [r["total_claims"] for r in rows]},
                    {"label": "Approved Claims", "data": [r["approved_claims"] for r in rows]},
                    {"label": "Pending Claims", "data": [r["pending_claims"] for r in rows]},
                    {"label": "Rejected Claims", "data": [r["rejected_claims"] for r in rows]}
                ]
            })

        # Filter options
        if path == '/api/filters':
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT DISTINCT state FROM claims ORDER BY state")
            states = [row["state"] for row in c.fetchall()]
            c.execute("SELECT DISTINCT district FROM claims ORDER BY district")
            districts = [row["district"] for row in c.fetchall()]
            c.execute("SELECT DISTINCT status FROM claims ORDER BY status")
            statuses = [row["status"] for row in c.fetchall()]
            c.execute("SELECT DISTINCT severity FROM claims ORDER BY severity")
            severities = [row["severity"] for row in c.fetchall()]
            conn.close()

            anomaly_types = [
                "DELAYED_CLAIM",
                "LAND_RECORD_MISMATCH",
                "INCOMPLETE_DOCUMENTATION",
                "UNUSUAL_AREA",
                "GEOGRAPHIC_INCONSISTENCY",
                "POSSIBLE_DUPLICATE"
            ]
            return self.send_json({
                "states": states,
                "districts": districts,
                "statuses": statuses,
                "severities": severities,
                "anomaly_types": anomaly_types
            })

        # Serve static files from web root if path is not an API
        web_dir = BASE_DIR.parent / "web"
        if not web_dir.exists():
            web_dir = BASE_DIR.parent
        
        file_path = web_dir / path.lstrip('/')
        if path == '' or path == '/':
            file_path = web_dir / "index.html"

        if file_path.exists() and file_path.is_file():
            self.directory = str(web_dir)
            return super().do_GET()

        # Fallback 404
        return self.send_json({"detail": f"Path not found: {path}"}, 404)

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')

        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        try:
            req_data = json.loads(post_body.decode('utf-8'))
        except Exception:
            req_data = {}

        # Record officer administrative disposition
        if path.startswith('/api/claims/') and path.endswith('/disposition'):
            claim_id = path[len('/api/claims/'):-len('/disposition')]
            action_type = req_data.get('action_type', 'OFFICER_REVIEWED')
            officer_name = req_data.get('officer_name', 'Administrative Review Officer')
            officer_designation = req_data.get('officer_designation', 'SDLC Verification Committee')
            remarks = req_data.get('remarks', '')

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT claim_id FROM claims WHERE claim_id = ?", (claim_id,))
            if not c.fetchone():
                conn.close()
                return self.send_json({"detail": "Claim not found"}, 404)

            now_str = datetime.datetime.now().strftime('%Y%m%d')
            h = abs(hash(claim_id + action_type + str(datetime.datetime.now().timestamp()))) % 10000
            notice_ref_no = f"SDLC/{now_str}/NOT-{h:04d}"
            created_at = datetime.datetime.now().isoformat()

            c.execute('''
                INSERT INTO claim_dispositions 
                (claim_id, action_type, officer_name, officer_designation, remarks, notice_ref_no, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (claim_id, action_type, officer_name, officer_designation, remarks, notice_ref_no, created_at))
            conn.commit()
            conn.close()

            # Sync to Supabase if configured
            if HAS_SUPABASE and SupabaseService.is_configured():
                SupabaseService.record_disposition(
                    claim_id=claim_id,
                    action_type=action_type,
                    officer_name=officer_name,
                    officer_designation=officer_designation,
                    remarks=remarks,
                    notice_ref_no=notice_ref_no
                )

            return self.send_json({
                "status": "success",
                "message": "Disposition recorded successfully",
                "disposition": {
                    "claim_id": claim_id,
                    "action_type": action_type,
                    "officer_name": officer_name,
                    "officer_designation": officer_designation,
                    "remarks": remarks,
                    "notice_ref_no": notice_ref_no,
                    "created_at": created_at
                }
            }, 201)

        # Policy Backlog Clearance Simulation
        if path == '/api/simulation/clearance':
            state = req_data.get('state')
            district = req_data.get('district')
            teams = int(req_data.get('additional_survey_teams', 2))
            fast_track_small = bool(req_data.get('fast_track_small_holdings', True))
            target_days = int(req_data.get('target_resolution_days', 90))

            conn = get_db()
            c = conn.cursor()
            query = "SELECT COUNT(*) as pending_total, AVG(area_acres) as avg_area FROM claims WHERE status IN ('Pending', 'Under Review')"
            params = []
            if state:
                query += " AND state = ?"
                params.append(state)
            if district:
                query += " AND district = ?"
                params.append(district)
            c.execute(query, params)
            row = c.fetchone()
            pending_count = row["pending_total"] if row and row["pending_total"] else 0
            conn.close()

            # Baseline speed: ~14 claims / week / district
            baseline_speed = 14
            # Each survey team adds ~12 claims / week capacity
            new_speed = baseline_speed + (teams * 12)
            if fast_track_small:
                # 28% boost in speed for under 2-acre claims
                new_speed = int(new_speed * 1.28)

            baseline_weeks = math.ceil(pending_count / baseline_speed) if pending_count > 0 else 1
            projected_weeks = math.ceil(pending_count / new_speed) if pending_count > 0 else 1
            days_saved = max(0, (baseline_weeks - projected_weeks) * 7)

            # Trajectory curve
            weeks = min(20, max(4, projected_weeks + 2))
            trajectory = []
            current = pending_count
            for w in range(weeks + 1):
                trajectory.append({
                    "week": w,
                    "remaining_claims": max(0, current),
                    "cleared_claims": min(pending_count, pending_count - current)
                })
                current -= new_speed

            return self.send_json({
                "pending_claims": pending_count,
                "additional_teams": teams,
                "fast_track_enabled": fast_track_small,
                "baseline_weeks": baseline_weeks,
                "projected_weeks": projected_weeks,
                "days_saved": days_saved,
                "clearance_rate_weekly": new_speed,
                "trajectory": trajectory
            })

        # AI: Analyze claim
        if path == '/api/ai/analyze-claim':
            claim_id = req_data.get('claim_id')
            if not claim_id:
                return self.send_json({"detail": "claim_id required"}, 400)

            claim = None
            if HAS_SUPABASE and SupabaseService.is_configured():
                claim = SupabaseService.fetch_claim_by_id(claim_id)

            if not claim:
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
                row = c.fetchone()
                conn.close()
                if not row:
                    return self.send_json({"detail": "Claim not found"}, 404)

                claim = dict(row)
                try:
                    claim["anomaly_types"] = json.loads(claim["anomaly_types"])
                except Exception:
                    claim["anomaly_types"] = []

            # Try LLM if configured
            if GEMINI_API_KEY:
                try:
                    ssl_ctx = ssl._create_unverified_context()
                    prompt_text = f"""You are an AI decision support assistant for the Forest Rights Act (FRA) Monitoring System.
Analyze this flagged claim data and output a JSON response:
Claim: {json.dumps(claim, indent=2)}

Required JSON fields:
- summary: 2-sentence executive summary
- why_flagged: array of specific reasons
- severity_assessment: why severity is {claim.get('severity')}
- recommended_action: concrete next action for the verification officer
- evidence: key-value dictionary of supporting data points
- disclaimer: standard decision support disclaimer (not a legal conclusion)"""

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                    req = urllib.request.Request(
                        url,
                        data=json.dumps({
                            "contents": [{"parts": [{"text": prompt_text}]}],
                            "generationConfig": {"response_mime_type": "application/json"}
                        }).encode('utf-8'),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, context=ssl_ctx, timeout=25) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                        import re
                        m = re.search(r'\{.*\}', text, re.DOTALL)
                        clean_json = m.group(0) if m else text
                        parsed = json.loads(clean_json)
                        parsed["live_ai"] = True
                        parsed["model"] = "gemini-2.5-flash"
                        if "disclaimer" not in parsed or "without AI assistance" in parsed.get("disclaimer", ""):
                            parsed["disclaimer"] = "Google Gemini 2.5 Flash live assessment generated for statutory decision support. Flags claims for administrative review."
                        print(f"[AI] Successfully generated Gemini 2.5 Flash analysis for claim {claim_id}!")
                        return self.send_json(parsed)
                except Exception as e:
                    print(f"Gemini API call failed or timed out: {e}. Using deterministic fallback.")

            # Deterministic Rule-Based Fallback
            anomaly_descriptions = {
                "DELAYED_CLAIM": f"Processing delayed by {claim.get('days_pending', 0)} days beyond threshold",
                "LAND_RECORD_MISMATCH": f"Cadastral records indicate discrepancy with claimed {claim.get('area_acres')} acres",
                "INCOMPLETE_DOCUMENTATION": "Supporting caste certificate or Gram Sabha recommendation missing",
                "UNUSUAL_AREA": f"Claimed area of {claim.get('area_acres')} acres significantly exceeds typical 2-4 acre district norm",
                "GEOGRAPHIC_INCONSISTENCY": "GPS plot coordinates fall outside gazetted forest division polygon",
                "POSSIBLE_DUPLICATE": "Identical claimant name and survey boundary matched to an existing record"
            }
            reasons = [anomaly_descriptions.get(t, t.replace('_', ' ').title()) for t in claim.get("anomaly_types", [])]

            if not reasons:
                reasons = ["Routine verification review — no severe anomalies detected"]

            severity = claim.get("severity", "Normal")
            if severity == "Critical":
                rec_action = f"High-priority manual audit required by Sub-Divisional Committee (SDLC). Halt approval until land survey and physical verification of Gram Sabha resolution are validated."
            elif severity == "High":
                rec_action = f"Forward to District Level Committee (DLC) for expedited field inspection and cadastral boundary verification."
            elif severity == "Medium":
                rec_action = f"Request missing documentation from claimant through local Forest Rights Committee (FRC)."
            else:
                rec_action = "Proceed with standard administrative processing schedule."

            summary = (
                f"Claim {claim.get('claim_id')} submitted by {claim.get('claimant_name')} for {claim.get('area_acres')} acres "
                f"in {claim.get('district')}, {claim.get('state')}. "
                f"Current status is {claim.get('status')} with an anomaly score of {claim.get('anomaly_score')}/100 ({severity})."
            )

            return self.send_json({
                "summary": summary,
                "why_flagged": reasons,
                "severity_assessment": f"Classified as {severity} priority based on automated evaluation of {len(claim.get('anomaly_types', []))} rule violation(s).",
                "recommended_action": rec_action,
                "evidence": {
                    "Claim ID": claim.get("claim_id"),
                    "Claimant": claim.get("claimant_name"),
                    "District": f"{claim.get('district')}, {claim.get('state')}",
                    "Status": claim.get("status"),
                    "Days Pending": f"{claim.get('days_pending')} days",
                    "Land Records": claim.get("land_record_status"),
                    "Documents": "Complete" if claim.get("documents_complete") else "Incomplete",
                    "Area Claimed": f"{claim.get('area_acres')} acres",
                    "Calculated Anomaly Score": f"{claim.get('anomaly_score')} / 100"
                },
                "disclaimer": "This intelligence report was generated for decision support. It flags claims for administrative attention and does not constitute a legal determination."
            })

        # AI: State summary
        if path == '/api/ai/state-summary':
            state_name = req_data.get('state')
            if not state_name:
                return self.send_json({"detail": "state required"}, 400)

            conn = get_db()
            c = conn.cursor()
            c.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies,
                    SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
                FROM claims
                WHERE state = ?
            ''', (state_name,))
            stats = dict(c.fetchone())
            conn.close()

            if stats["total"] == 0:
                return self.send_json({"detail": "State not found"}, 404)

            approval_rate = round((stats["approved"] / stats["total"]) * 100, 1)

            # Try LLM if configured
            if GEMINI_API_KEY:
                try:
                    ssl_ctx = ssl._create_unverified_context()
                    prompt_text = f"""You are an executive AI decision support assistant for the Forest Rights Act (FRA) Monitoring System.
Analyze this state-level progress data and write a concise, professional executive briefing (2-3 paragraphs) evaluating progress, bottlenecks, anomaly rates, and actionable administrative recommendations for the state administration.
State: {state_name}
Stats:
- Total Claims: {stats['total']}
- Approved: {stats['approved']} ({approval_rate}%)
- Pending: {stats['pending']}
- Rejected: {stats['rejected']}
- Total Anomalies: {stats['anomalies']}
- High/Critical Priority Anomalies: {stats['high_priority']}

Output plain text (or markdown) summary suitable for senior IAS officers and Forest Department secretaries."""

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                    req = urllib.request.Request(
                        url,
                        data=json.dumps({
                            "contents": [{"parts": [{"text": prompt_text}]}]
                        }).encode('utf-8'),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, context=ssl_ctx, timeout=25) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        summary_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                        return self.send_json({"state": state_name, "summary": summary_text, "stats": stats, "model": "gemini-2.5-flash"})
                except Exception as e:
                    print(f"Gemini state summary failed: {e}. Using deterministic fallback.")

            summary = (
                f"{state_name} currently has {stats['total']} total FRA claims on record, with {stats['approved']} claims approved "
                f"({approval_rate}% approval rate). There are {stats['pending']} claims currently pending review, of which "
                f"{stats['high_priority']} claims are classified as high or critical priority requiring urgent attention. "
                f"A total of {stats['anomalies']} claims exhibit one or more detected anomalies (e.g. processing delays or land record mismatches). "
                f"Administrative focus should be directed toward clearing backlogged claims in priority districts."
            )
            return self.send_json({"state": state_name, "summary": summary, "stats": stats, "model": "rule-based-fallback"})

        return self.send_json({"detail": f"Path not found: {path}"}, 404)

def run_server(port=8000):
    server_address = ('0.0.0.0', port)
    httpd = http.server.ThreadingHTTPServer(server_address, FRAServerHandler)
    print(f"VanRaksha AI Backend Server running on http://0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
