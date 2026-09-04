from sqlite3 import Connection
import json

from app.services.anomaly_context import build_context, get_district_context, get_state_context
from app.services.anomaly_evidence import build_anomaly_evidence


from app.services.anomaly_engine import AnomalyEngine


class StatisticsService:
    @staticmethod
    def get_priority_districts(db: Connection, limit: int = 8) -> list[dict]:
        """Districts requiring attention based on pending rate vs state average and anomalies."""
        cursor = db.cursor()
        cursor.execute("""
            SELECT
                c.district,
                c.state,
                COUNT(*) AS total,
                SUM(CASE WHEN c.status = 'Approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN c.anomaly_score > 0 THEN 1 ELSE 0 END) AS anomalies,
                SUM(CASE WHEN c.severity IN ('High', 'Critical') THEN 1 ELSE 0 END) AS high_priority,
                ROUND(AVG(CASE WHEN c.status IN ('Pending', 'Under Review') THEN c.days_pending END)) AS avg_pending_days
            FROM claims c
            GROUP BY c.district, c.state
        """)
        districts = []
        context = build_context(db)
        for row in cursor.fetchall():
            d = dict(row)
            state_ctx = get_state_context(context, d["state"])
            d["approval_rate"] = round((d["approved"] / d["total"]) * 100, 1) if d["total"] else 0
            d["pending_rate"] = round((d["pending"] / d["total"]) * 100, 1) if d["total"] else 0
            d["state_avg_pending_rate"] = state_ctx.get("pending_rate", 0)
            # Priority score: anomalies + high pending rate vs state
            pending_gap = max(0, d["pending_rate"] - state_ctx.get("pending_rate", 0))
            d["priority_score"] = d["anomalies"] * 2 + d["high_priority"] * 3 + pending_gap
            reasons = []
            if d["pending_rate"] > state_ctx.get("pending_rate", 0) + 10:
                reasons.append("high pending rate")
            if d["anomalies"] >= 3:
                reasons.append("elevated anomalies")
            if d["high_priority"] >= 1:
                reasons.append("high/critical cases")
            if d.get("avg_pending_days", 0) > state_ctx.get("avg_pending_days", 0) * 1.5:
                reasons.append("delayed processing")
            d["attention_reasons"] = reasons or ["monitoring recommended"]
            districts.append(d)

        districts.sort(key=lambda x: x["priority_score"], reverse=True)
        return districts[:limit]

    @staticmethod
    def get_state_summary_table(db: Connection) -> list[dict]:
        cursor = db.cursor()
        cursor.execute("""
            SELECT
                state,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) AS anomalies,
                ROUND(AVG(CASE WHEN status = 'Approved' AND approval_date IS NOT NULL
                    THEN julianday(approval_date) - julianday(submission_date) END)) AS avg_processing_days
            FROM claims
            GROUP BY state
            ORDER BY total DESC
        """)
        rows = []
        for row in cursor.fetchall():
            d = dict(row)
            d["approval_rate"] = round((d["approved"] / d["total"]) * 100, 1) if d["total"] else 0
            rows.append(d)
        return rows

    @staticmethod
    def get_district_geojson(db: Connection) -> dict:
        """Build lightweight district polygons from claim centroid clusters."""
        cursor = db.cursor()
        cursor.execute("""
            SELECT district, state,
                   AVG(latitude) AS lat,
                   AVG(longitude) AS lon,
                   COUNT(*) AS claim_count,
                   SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) AS anomalies
            FROM claims
            GROUP BY district, state
        """)
        features = []
        for row in cursor.fetchall():
            lat, lon = row["lat"], row["lon"]
            # ~0.25° box around district centroid (~25km)
            delta = 0.25
            poly = [
                [lon - delta, lat - delta],
                [lon + delta, lat - delta],
                [lon + delta, lat + delta],
                [lon - delta, lat + delta],
                [lon - delta, lat - delta],
            ]
            anomaly_rate = round((row["anomalies"] / row["claim_count"]) * 100, 1) if row["claim_count"] else 0
            features.append({
                "type": "Feature",
                "properties": {
                    "district": row["district"],
                    "state": row["state"],
                    "claim_count": row["claim_count"],
                    "anomalies": row["anomalies"],
                    "anomaly_rate": anomaly_rate,
                },
                "geometry": {"type": "Polygon", "coordinates": [poly]},
            })
        return {"type": "FeatureCollection", "features": features}

    @staticmethod
    def get_claim_evidence(db: Connection, claim_id: str) -> dict | None:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
        row = cursor.fetchone()
        if not row:
            return None
        claim = dict(row)
        try:
            claim["anomaly_types"] = json.loads(claim["anomaly_types"])
        except Exception:
            claim["anomaly_types"] = []

        context = build_context(db)
        district_ctx = get_district_context(context, claim["district"], claim["state"])
        state_ctx = get_state_context(context, claim["state"])
        evidence = build_anomaly_evidence(claim, district_ctx, state_ctx)

        return {
            "claim_id": claim_id,
            "has_anomaly": claim["anomaly_score"] > 0,
            "score": claim["anomaly_score"],
            "severity": claim["severity"],
            "types": claim["anomaly_types"],
            "evidence": evidence,
            "district_context": district_ctx,
            "state_context": state_ctx,
            "score_breakdown": AnomalyEngine.get_score_breakdown(claim["anomaly_types"]),
        }

    @staticmethod
    def get_dashboard_stats(db: Connection) -> dict:
        cursor = db.cursor()

        # Total claims
        cursor.execute("SELECT COUNT(*) as total FROM claims")
        total_claims = cursor.fetchone()["total"]

        # Status counts
        cursor.execute("SELECT status, COUNT(*) as count FROM claims GROUP BY status")
        status_counts = {row["status"]: row["count"] for row in cursor.fetchall()}
        approved = status_counts.get("Approved", 0)
        pending = status_counts.get("Pending", 0)
        rejected = status_counts.get("Rejected", 0)
        under_review = status_counts.get("Under Review", 0)

        approval_percentage = round((approved / total_claims) * 100, 1) if total_claims > 0 else 0

        # Anomalies
        cursor.execute("SELECT COUNT(*) as total FROM claims WHERE anomaly_score > 0")
        total_anomalies = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as total FROM claims WHERE severity IN ('High', 'Critical')")
        high_priority_anomalies = cursor.fetchone()["total"]

        # Avg processing days for approved claims
        cursor.execute('''
            SELECT AVG(julianday(approval_date) - julianday(submission_date)) as avg_days
            FROM claims
            WHERE status = 'Approved' AND approval_date IS NOT NULL
        ''')
        row = cursor.fetchone()
        avg_processing_days = round(row["avg_days"]) if row and row["avg_days"] else 0

        # Top 10 anomalies by score
        cursor.execute("""
            SELECT * FROM claims
            WHERE anomaly_score > 0
            ORDER BY anomaly_score DESC
            LIMIT 10
        """)
        raw_recent = cursor.fetchall()
        recent_anomalies = []
        for r in raw_recent:
            d = dict(r)
            try:
                d["anomaly_types"] = json.loads(d["anomaly_types"])
            except Exception:
                pass
            recent_anomalies.append(d)

        return {
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
            "priority_districts": StatisticsService.get_priority_districts(db),
            "state_summary": StatisticsService.get_state_summary_table(db),
        }
