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
    def evaluate(claim: dict) -> tuple[int, str, list[str]]:
        score = 0
        anomaly_types = []

        # Rule 1: Delayed claim
        threshold = getattr(settings, 'DELAY_THRESHOLD_DAYS', 180)
        if claim.get("status") == "Pending" and claim.get("days_pending", 0) > threshold:
            score += 25
            anomaly_types.append("DELAYED_CLAIM")

        # Rule 2: Land record mismatch (for active claims only)
        if claim.get("land_record_status") == "Mismatch" and claim.get("status") != "Approved":
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
            "LAND_RECORD_MISMATCH": "Land records show discrepancy with claimed area",
            "INCOMPLETE_DOCUMENTATION": "Required supporting documents are missing",
            "UNUSUAL_AREA": "Claimed area significantly exceeds district average",
            "GEOGRAPHIC_INCONSISTENCY": "Claim coordinates may fall outside expected district boundary",
            "POSSIBLE_DUPLICATE": "Potential duplicate submission detected based on similar attributes",
        }
        return descriptions.get(anomaly_type, "Unknown anomaly type")

    @staticmethod
    def get_score_breakdown(anomaly_types: list[str]) -> list[dict]:
        score_map = {
            "DELAYED_CLAIM": 25,
            "LAND_RECORD_MISMATCH": 35,
            "INCOMPLETE_DOCUMENTATION": 20,
            "UNUSUAL_AREA": 15,
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
