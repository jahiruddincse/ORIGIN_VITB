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
from pathlib import Path
import datetime

# Database setup
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fra_monitor.db"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", os.environ.get("LLM_API_KEY", ""))

def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

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

        # Dashboard KPIs & stats
        if path == '/api/dashboard':
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
                "recent_anomalies": recent_anomalies
            })

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
                d["approval_rate"] = round((d["approved"] / d["total"]) * 100, 1) if d["total"] > 0 else 0
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
            conn.close()
            return self.send_json({
                "state": state_name,
                "state_stats": state_stats,
                "total_claims": state_stats["total"],
                "districts": districts
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
            return self.send_json({"district": district_name, "stats": stats})

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
                rows.append(d)
            conn.close()

            pages = (total + limit - 1) // limit if total > 0 else 1
            return self.send_json({
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "data": rows
            })

        # Single claim detail
        if path.startswith('/api/claims/'):
            claim_id = path[len('/api/claims/'):]
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
            web_dir = BASE_DIR.parent / "frontend"
        
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

        # AI: Analyze claim
        if path == '/api/ai/analyze-claim':
            claim_id = req_data.get('claim_id')
            if not claim_id:
                return self.send_json({"detail": "claim_id required"}, 400)

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
                    import urllib.request
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

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
                    req = urllib.request.Request(
                        url,
                        data=json.dumps({
                            "contents": [{"parts": [{"text": prompt_text}]}],
                            "generationConfig": {"response_mime_type": "application/json"}
                        }).encode('utf-8'),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        res_json = json.loads(resp.read().decode('utf-8'))
                        text = res_json['candidates'][0]['content']['parts'][0]['text']
                        return self.send_json(json.loads(text))
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

            summary = (
                f"{state_name} currently has {stats['total']} total FRA claims on record, with {stats['approved']} claims approved "
                f"({approval_rate}% approval rate). There are {stats['pending']} claims currently pending review, of which "
                f"{stats['high_priority']} claims are classified as high or critical priority requiring urgent attention. "
                f"A total of {stats['anomalies']} claims exhibit one or more detected anomalies (e.g. processing delays or land record mismatches). "
                f"Administrative focus should be directed toward clearing backlogged claims in priority districts."
            )
            return self.send_json({"state": state_name, "summary": summary, "stats": stats})

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
