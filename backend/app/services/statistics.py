from sqlite3 import Connection
import json


class StatisticsService:
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
            "recent_anomalies": recent_anomalies
        }
