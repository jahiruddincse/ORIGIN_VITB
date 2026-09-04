"""Structured, explainable evidence for flagged anomalies."""

from app.config import settings
from app.services.anomaly_engine import AnomalyEngine


def _area_mismatch_pct(claimed: float, recorded: float) -> float:
    if not claimed:
        return 0.0
    return round(abs(claimed - recorded) / claimed * 100, 1)


def build_anomaly_evidence(claim: dict, district_ctx: dict, state_ctx: dict) -> list[dict]:
    """Return explainable evidence blocks for each detected anomaly type."""
    threshold = getattr(settings, "DELAY_THRESHOLD_DAYS", 180)
    evidence_list = []
    types = claim.get("anomaly_types", [])
    if isinstance(types, str):
        import json
        try:
            types = json.loads(types)
        except Exception:
            types = []

    claimed = float(claim.get("area_acres") or claim.get("claimed_area") or 0)
    recorded = float(claim.get("recorded_area") or claimed)

    for anomaly_type in types:
        block = {
            "type": anomaly_type,
            "label": anomaly_type.replace("_", " ").title(),
            "severity_hint": "Potential anomaly — requires review",
            "metrics": {},
            "explanation": AnomalyEngine.get_anomaly_description(anomaly_type),
        }

        if anomaly_type == "DELAYED_CLAIM":
            days = claim.get("days_pending", 0)
            dist_avg = district_ctx.get("avg_pending_days", 0)
            block["metrics"] = {
                "pending_days": days,
                "threshold_days": threshold,
                "district_average_days": dist_avg,
                "state_average_days": state_ctx.get("avg_pending_days", 0),
            }
            block["explanation"] = (
                f"Potential processing delay. Claim has been pending for {days} days "
                f"(threshold: {threshold} days; district average: {dist_avg} days). "
                "This exceeds the expected processing period and may require administrative review."
            )

        elif anomaly_type == "LAND_RECORD_MISMATCH":
            pct = _area_mismatch_pct(claimed, recorded)
            block["metrics"] = {
                "claimed_area_acres": claimed,
                "recorded_area_acres": recorded,
                "area_difference_pct": pct,
                "land_record_status": claim.get("land_record_status", "Unknown"),
            }
            block["explanation"] = (
                f"Potential land-record data mismatch. Claimed area is {claimed} acres but "
                f"cadastral records show {recorded} acres ({pct}% difference). "
                "Verify revenue/forest boundary records before proceeding."
            )

        elif anomaly_type == "DELAY_VS_DISTRICT_AVG":
            days = claim.get("days_pending", 0)
            dist_avg = max(district_ctx.get("avg_pending_days", 1), 1)
            block["metrics"] = {
                "pending_days": days,
                "district_average_days": dist_avg,
                "ratio_to_average": round(days / dist_avg, 1),
            }
            block["explanation"] = (
                f"Unusual delay pattern. Pending for {days} days — more than twice the "
                f"district average of {dist_avg} days. May indicate a local processing bottleneck."
            )

        elif anomaly_type == "UNUSUAL_PROCESSING":
            days = claim.get("days_pending", 0)
            dist_avg = max(district_ctx.get("avg_approved_days", 1), 1)
            block["metrics"] = {
                "processing_days": days,
                "district_average_approved_days": dist_avg,
                "ratio_to_average": round(days / dist_avg, 1),
            }
            block["explanation"] = (
                f"Unusual processing time. Completed in {days} days vs district average "
                f"of {dist_avg} days for approved claims. Worth verifying whether expedited "
                "or irregular handling occurred."
            )

        elif anomaly_type == "INCOMPLETE_DOCUMENTATION":
            block["metrics"] = {
                "documents_complete": claim.get("documents_complete", False),
                "status": claim.get("status"),
            }
            block["explanation"] = (
                "Required supporting documents (e.g. Gram Sabha resolution, identity proof) "
                "are marked incomplete for an active claim. Request missing records from the claimant."
            )

        elif anomaly_type == "UNUSUAL_AREA":
            block["metrics"] = {
                "claimed_area_acres": claimed,
                "district_typical_range": "0.5–15 acres",
            }
            block["explanation"] = (
                f"Claimed area of {claimed} acres exceeds the typical individual-claim range. "
                "Verify eligibility and community vs individual classification."
            )

        elif anomaly_type == "GEOGRAPHIC_INCONSISTENCY":
            block["metrics"] = {
                "latitude": claim.get("latitude"),
                "longitude": claim.get("longitude"),
                "district": claim.get("district"),
                "state": claim.get("state"),
            }
            block["explanation"] = (
                "GPS coordinates may fall outside the expected district boundary polygon. "
                "Ground verification of plot location is recommended."
            )

        elif anomaly_type == "POSSIBLE_DUPLICATE":
            block["metrics"] = {
                "claimant_name": claim.get("claimant_name"),
                "district": claim.get("district"),
            }
            block["explanation"] = (
                "Potential duplicate submission detected based on similar claimant attributes "
                "in the same district. Cross-check against existing active files."
            )

        evidence_list.append(block)

    return evidence_list
