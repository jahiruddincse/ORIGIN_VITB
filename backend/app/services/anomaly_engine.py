"""
Deterministic rule-based anomaly detection engine.

Scoring per spec:
  DELAYED_CLAIM           = +25
  LAND_RECORD_MISMATCH    = +35
  INCOMPLETE_DOCUMENTATION = +20
  UNUSUAL_AREA            = +15
  GEOGRAPHIC_INCONSISTENCY = +30
  POSSIBLE_DUPLICATE      = +25

Severity mapping:
  0-19  = Normal
  20-39 = Low
  40-59 = Medium
  60-79 = High
  80+   = Critical
"""

from app.config import settings


class AnomalyEngine:
    @staticmethod
    def evaluate(claim: dict, district_ctx: dict | None = None) -> tuple[int, str, list[str]]:
        score = 0
        anomaly_types = []
        district_ctx = district_ctx or {}

        # Rule 1: Delayed claim (fixed threshold)
        threshold = getattr(settings, 'DELAY_THRESHOLD_DAYS', 180)
        days_pending = claim.get("days_pending", 0)
        if claim.get("status") in ("Pending", "Under Review") and days_pending > threshold:
            score += 25
            anomaly_types.append("DELAYED_CLAIM")

        # Rule 1b: Delay vs district average (>2x district avg pending)
        dist_avg_pending = district_ctx.get("avg_pending_days", 0)
        if (
            claim.get("status") in ("Pending", "Under Review")
            and dist_avg_pending > 0
            and days_pending > dist_avg_pending * 2
            and "DELAY_VS_DISTRICT_AVG" not in anomaly_types
        ):
            score += 20
            anomaly_types.append("DELAY_VS_DISTRICT_AVG")

        # Rule 2: Land record mismatch (status flag or area difference >20%)
        claimed = float(claim.get("area_acres") or claim.get("claimed_area") or 0)
        recorded = float(claim.get("recorded_area") or claimed)
        area_diff_pct = abs(claimed - recorded) / claimed * 100 if claimed else 0
        has_area_mismatch = area_diff_pct > 20
        if claim.get("status") != "Approved" and (
            claim.get("land_record_status") == "Mismatch" or has_area_mismatch
        ):
            score += 35
            anomaly_types.append("LAND_RECORD_MISMATCH")

        # Rule 3: Missing documentation (for active claims only)
        if not claim.get("documents_complete") and claim.get("status") in ("Pending", "Under Review"):
            score += 20
            anomaly_types.append("INCOMPLETE_DOCUMENTATION")

        # Rule 4: Unusual land area (simple threshold — 95th percentile is ~15 acres)
        if claim.get("area_acres", 0) > 15:
            score += 15
            anomaly_types.append("UNUSUAL_AREA")

        # Rule 5: Geographic inconsistency
        # Check if coordinates fall outside expected state bounds
        if claim.get("_geo_inconsistent", False):
            score += 30
            anomaly_types.append("GEOGRAPHIC_INCONSISTENCY")

        # Rule 6: Possible duplicate
        if claim.get("_possible_duplicate", False):
            score += 25
            anomaly_types.append("POSSIBLE_DUPLICATE")

        # Rule 7: Unusual processing time for approved claims (>2x district avg)
        dist_avg_approved = district_ctx.get("avg_approved_days", 0)
        if (
            claim.get("status") == "Approved"
            and dist_avg_approved > 0
            and days_pending > dist_avg_approved * 2
        ):
            score += 15
            anomaly_types.append("UNUSUAL_PROCESSING")

        # Clamp
        score = min(100, max(0, score))

        # Severity mapping per spec
        if score >= 80:
            severity = "Critical"
        elif score >= 60:
            severity = "High"
        elif score >= 40:
            severity = "Medium"
        elif score >= 20:
            severity = "Low"
        else:
            severity = "Normal"

        return score, severity, anomaly_types

    @staticmethod
    def get_anomaly_description(anomaly_type: str) -> str:
        descriptions = {
            "DELAYED_CLAIM": f"Claim has been pending beyond the {getattr(settings, 'DELAY_THRESHOLD_DAYS', 180)}-day threshold",
            "DELAY_VS_DISTRICT_AVG": "Pending duration exceeds twice the district average processing time",
            "LAND_RECORD_MISMATCH": "Land records show discrepancy with claimed area",
            "INCOMPLETE_DOCUMENTATION": "Required supporting documents are missing",
            "UNUSUAL_AREA": "Claimed area significantly exceeds district average",
            "UNUSUAL_PROCESSING": "Processing time unusually high or low compared with similar claims",
            "GEOGRAPHIC_INCONSISTENCY": "Claim coordinates may fall outside expected district boundary",
            "POSSIBLE_DUPLICATE": "Potential duplicate submission detected based on similar attributes",
        }
        return descriptions.get(anomaly_type, "Unknown anomaly type")

    @staticmethod
    def get_score_breakdown(anomaly_types: list[str]) -> list[dict]:
        score_map = {
            "DELAYED_CLAIM": 25,
            "DELAY_VS_DISTRICT_AVG": 20,
            "LAND_RECORD_MISMATCH": 35,
            "INCOMPLETE_DOCUMENTATION": 20,
            "UNUSUAL_AREA": 15,
            "UNUSUAL_PROCESSING": 15,
            "GEOGRAPHIC_INCONSISTENCY": 30,
            "POSSIBLE_DUPLICATE": 25,
        }
        return [
            {
                "type": t,
                "score": score_map.get(t, 0),
                "description": AnomalyEngine.get_anomaly_description(t)
            }
            for t in anomaly_types
        ]
