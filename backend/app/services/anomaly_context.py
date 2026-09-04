"""District and state statistics used for context-aware anomaly detection."""

from sqlite3 import Connection


def build_context(db: Connection) -> dict:
    """Pre-compute district/state averages for anomaly evaluation."""
    cursor = db.cursor()

    cursor.execute("""
        SELECT district, state,
               AVG(CASE WHEN status IN ('Pending', 'Under Review') THEN days_pending END) AS avg_pending_days,
               AVG(CASE WHEN status = 'Approved' AND approval_date IS NOT NULL
                   THEN julianday(approval_date) - julianday(submission_date) END) AS avg_approved_days,
               COUNT(*) AS total,
               SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
        FROM claims
        GROUP BY district, state
    """)
    district_stats = {}
    for row in cursor.fetchall():
        key = (row["district"], row["state"])
        district_stats[key] = {
            "district": row["district"],
            "state": row["state"],
            "avg_pending_days": round(row["avg_pending_days"] or 0),
            "avg_approved_days": round(row["avg_approved_days"] or 0),
            "total": row["total"],
            "pending_count": row["pending_count"],
            "pending_rate": round((row["pending_count"] / row["total"]) * 100, 1) if row["total"] else 0,
        }

    cursor.execute("""
        SELECT state,
               AVG(CASE WHEN status IN ('Pending', 'Under Review') THEN days_pending END) AS avg_pending_days,
               AVG(CASE WHEN status = 'Approved' AND approval_date IS NOT NULL
                   THEN julianday(approval_date) - julianday(submission_date) END) AS avg_approved_days,
               COUNT(*) AS total,
               SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
        FROM claims
        GROUP BY state
    """)
    state_stats = {}
    for row in cursor.fetchall():
        state_stats[row["state"]] = {
            "state": row["state"],
            "avg_pending_days": round(row["avg_pending_days"] or 0),
            "avg_approved_days": round(row["avg_approved_days"] or 0),
            "total": row["total"],
            "pending_count": row["pending_count"],
            "pending_rate": round((row["pending_count"] / row["total"]) * 100, 1) if row["total"] else 0,
        }

    return {"district": district_stats, "state": state_stats}


def get_district_context(context: dict, district: str, state: str) -> dict:
    return context["district"].get((district, state), {
        "district": district,
        "state": state,
        "avg_pending_days": 0,
        "avg_approved_days": 0,
        "total": 0,
        "pending_count": 0,
        "pending_rate": 0,
    })


def get_state_context(context: dict, state: str) -> dict:
    return context["state"].get(state, {
        "state": state,
        "avg_pending_days": 0,
        "avg_approved_days": 0,
        "total": 0,
        "pending_count": 0,
        "pending_rate": 0,
    })
