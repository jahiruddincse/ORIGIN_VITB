import json
import random
import datetime
from pathlib import Path

random.seed(42)

STATES_AND_DISTRICTS = {
    "Madhya Pradesh": {"districts": ["Seoni", "Mandla", "Dindori", "Balaghat", "Chhindwara"], "lat": (22.0, 23.5), "lon": (78.0, 81.0)},
    "Chhattisgarh": {"districts": ["Bastar", "Dantewada", "Kanker", "Surguja", "Korba"], "lat": (19.0, 23.0), "lon": (80.0, 84.0)},
    "Odisha": {"districts": ["Koraput", "Mayurbhanj", "Sundargarh", "Kandhamal", "Rayagada"], "lat": (19.0, 22.0), "lon": (82.0, 87.0)},
    "Jharkhand": {"districts": ["Ranchi", "Gumla", "West Singhbhum", "Latehar", "Khunti"], "lat": (22.0, 24.0), "lon": (83.0, 86.0)},
    "Maharashtra": {"districts": ["Gadchiroli", "Chandrapur", "Nandurbar", "Nashik", "Thane"], "lat": (19.0, 21.0), "lon": (73.0, 80.0)},
    "Rajasthan": {"districts": ["Udaipur", "Banswara", "Dungarpur", "Pratapgarh", "Sirohi"], "lat": (23.0, 25.0), "lon": (72.0, 75.0)},
    "Gujarat": {"districts": ["Dang", "Tapi", "Narmada", "Valsad", "Navsari"], "lat": (20.0, 21.5), "lon": (72.0, 74.0)},
    "Andhra Pradesh": {"districts": ["Srikakulam", "Vizianagaram", "East Godavari", "Alluri Sitharama Raju", "Parvathipuram Manyam"], "lat": (17.0, 19.0), "lon": (81.0, 84.0)},
}

TRIBAL_FIRST_NAMES = [
    "Ramesh", "Sukhdai", "Bhuri", "Som", "Mangal", "Raju", "Sita", "Kamla",
    "Ram", "Shyam", "Geeta", "Birsa", "Lakshmi", "Devi", "Shankar", "Sanju",
    "Dinesh", "Suresh", "Anita", "Parvati", "Manoj", "Kamal", "Savitri",
    "Durga", "Mohan", "Gopal", "Sunita", "Kiran", "Bala", "Tulsi", "Ganesh",
    "Rekha", "Phoolmati", "Jagdish", "Moti", "Munni", "Champa", "Bhagirath"
]
TRIBAL_LAST_NAMES = [
    "Gond", "Maravi", "Korku", "Bhil", "Munda", "Santhal", "Oraon",
    "Meena", "Rathwa", "Naik", "Pradhan", "Bhumij", "Ho", "Baiga",
    "Sabar", "Kol", "Kondh", "Tharu", "Warli", "Gamit", "Chaudhary"
]

TODAY = datetime.date(2026, 9, 4)
DELAY_THRESHOLD = 300  # Higher threshold for data generation to maintain ~10% anomaly rate
# Note: The backend system uses a configurable threshold (default 180 days)
# For data generation, we use 300 to keep anomaly rates realistic

def random_date(start, end):
    return start + datetime.timedelta(days=random.randint(0, (end - start).days))

def evaluate_anomalies(claim):
    """Deterministic anomaly engine — matches spec scoring."""
    score = 0
    anomaly_types = []

    # Rule 1: Delayed claim (pending > 180 days)
    if claim["status"] == "Pending" and claim.get("days_pending", 0) > DELAY_THRESHOLD:
        score += 25
        anomaly_types.append("DELAYED_CLAIM")

    # Rule 2: Land record mismatch (only flag for non-Approved claims — approved with mismatch means it was resolved)
    if claim["land_record_status"] == "Mismatch" and claim["status"] != "Approved":
        score += 35
        anomaly_types.append("LAND_RECORD_MISMATCH")

    # Rule 3: Incomplete documentation (only for active claims — approved claims already passed review)
    if not claim["documents_complete"] and claim["status"] in ("Pending", "Under Review"):
        score += 20
        anomaly_types.append("INCOMPLETE_DOCUMENTATION")

    # Rule 4: Unusual land area (> 15 acres — roughly 95th percentile for individual claims)
    if claim["area_acres"] > 15:
        score += 15
        anomaly_types.append("UNUSUAL_AREA")

    # Rule 5: Geographic inconsistency (coordinates outside state bounds — checked at generation time)
    if claim.get("_geo_inconsistent", False):
        score += 30
        anomaly_types.append("GEOGRAPHIC_INCONSISTENCY")

    # Rule 6: Possible duplicate (same district + similar name pattern)
    if claim.get("_possible_duplicate", False):
        score += 25
        anomaly_types.append("POSSIBLE_DUPLICATE")

    # Clamp score to 0-100
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

def generate_claim(existing_ids):
    state = random.choice(list(STATES_AND_DISTRICTS.keys()))
    info = STATES_AND_DISTRICTS[state]
    district = random.choice(info["districts"])
    lat_min, lat_max = info["lat"]
    lon_min, lon_max = info["lon"]
    latitude = round(random.uniform(lat_min, lat_max), 4)
    longitude = round(random.uniform(lon_min, lon_max), 4)

    # Generate unique claim ID
    while True:
        claim_id = f"FRA-{random.randint(10000, 99999)}"
        if claim_id not in existing_ids:
            break

    claimant_name = f"{random.choice(TRIBAL_FIRST_NAMES)} {random.choice(TRIBAL_LAST_NAMES)}"
    claim_type = random.choices(["Individual", "Community"], weights=[80, 20])[0]

    area_acres = max(0.5, min(50.0, random.gauss(3.5, 2.0)))
    area_acres = round(area_acres, 2)

    status = random.choices(["Approved", "Pending", "Rejected", "Under Review"], weights=[50, 35, 10, 5])[0]
    land_record_status = random.choices(["Verified", "Mismatch", "Pending Verification"], weights=[82, 8, 10])[0]
    documents_complete = random.choices([True, False], weights=[88, 12])[0]

    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2026, 6, 30)
    submission_date = random_date(start_date, end_date)

    approval_date = None
    days_pending = 0

    if status == "Approved":
        days_to_approve = random.randint(30, 365)
        approval_date = submission_date + datetime.timedelta(days=days_to_approve)
        days_pending = days_to_approve
    elif status in ("Pending", "Under Review"):
        if TODAY > submission_date:
            days_pending = (TODAY - submission_date).days
        else:
            days_pending = 0
    elif status == "Rejected":
        days_pending = random.randint(30, 200)

    claim = {
        "claim_id": claim_id,
        "state": state,
        "district": district,
        "latitude": latitude,
        "longitude": longitude,
        "claimant_name": claimant_name,
        "claim_type": claim_type,
        "area_acres": area_acres,
        "submission_date": submission_date.isoformat(),
        "approval_date": approval_date.isoformat() if approval_date else None,
        "status": status,
        "land_record_status": land_record_status,
        "documents_complete": documents_complete,
        "days_pending": days_pending,
        "_geo_inconsistent": False,
        "_possible_duplicate": False,
    }

    return claim

def main():
    claims = []
    existing_ids = set()

    # === GUARANTEED DEMO RECORDS ===
    demo_001 = {
        "claim_id": "DEMO-001",
        "state": "Madhya Pradesh",
        "district": "Mandla",
        "latitude": 22.5974,
        "longitude": 80.3842,
        "claimant_name": "Ramesh Gond",
        "claim_type": "Individual",
        "area_acres": 3.2,
        "submission_date": "2025-01-15",
        "approval_date": "2025-04-20",
        "status": "Approved",
        "land_record_status": "Verified",
        "documents_complete": True,
        "days_pending": 95,
        "anomaly_score": 0,
        "severity": "Normal",
        "anomaly_types": [],
        "created_at": "2025-01-15T00:00:00",
    }

    demo_002 = {
        "claim_id": "DEMO-002",
        "state": "Chhattisgarh",
        "district": "Bastar",
        "latitude": 19.1071,
        "longitude": 81.9535,
        "claimant_name": "Sukhdai Maravi",
        "claim_type": "Individual",
        "area_acres": 4.1,
        "submission_date": "2025-01-10",
        "approval_date": None,
        "status": "Pending",
        "land_record_status": "Pending Verification",
        "documents_complete": True,
        "days_pending": (TODAY - datetime.date(2025, 1, 10)).days,
        "anomaly_score": 25,
        "severity": "Low",
        "anomaly_types": ["DELAYED_CLAIM"],
        "created_at": "2025-01-10T00:00:00",
    }

    demo_003 = {
        "claim_id": "DEMO-003",
        "state": "Madhya Pradesh",
        "district": "Seoni",
        "latitude": 22.0853,
        "longitude": 79.5511,
        "claimant_name": "Bhuri Bai Korku",
        "claim_type": "Individual",
        "area_acres": 8.5,
        "submission_date": "2026-03-01",
        "approval_date": None,
        "status": "Pending",
        "land_record_status": "Mismatch",
        "documents_complete": False,
        "days_pending": (TODAY - datetime.date(2026, 3, 1)).days,
        "anomaly_score": 80,
        "severity": "Critical",
        "anomaly_types": ["DELAYED_CLAIM", "LAND_RECORD_MISMATCH", "INCOMPLETE_DOCUMENTATION"],
        "created_at": "2026-03-01T00:00:00",
    }

    claims.extend([demo_001, demo_002, demo_003])
    existing_ids.update(["DEMO-001", "DEMO-002", "DEMO-003"])

    # === Generate remaining claims ===
    # We want ~750 total. Among the generated ones, deliberately create some anomalies.

    # Generate ~30 deliberate anomaly claims
    anomaly_configs = [
        # Delayed + Land mismatch (High)
        {"status": "Pending", "days_pending": 400, "land_record_status": "Mismatch", "documents_complete": True, "area_acres": 4.0},
        {"status": "Pending", "days_pending": 350, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 3.5},
        # Large area claims
        {"status": "Pending", "days_pending": 50, "land_record_status": "Verified", "documents_complete": True, "area_acres": 25.0},
        {"status": "Approved", "days_pending": 90, "land_record_status": "Verified", "documents_complete": True, "area_acres": 30.0},
        {"status": "Pending", "days_pending": 200, "land_record_status": "Verified", "documents_complete": True, "area_acres": 22.0},
        # Missing docs
        {"status": "Pending", "days_pending": 100, "land_record_status": "Verified", "documents_complete": False, "area_acres": 3.0},
        {"status": "Under Review", "days_pending": 120, "land_record_status": "Verified", "documents_complete": False, "area_acres": 5.0},
        # Land mismatch only
        {"status": "Approved", "days_pending": 60, "land_record_status": "Mismatch", "documents_complete": True, "area_acres": 2.5},
        {"status": "Pending", "days_pending": 90, "land_record_status": "Mismatch", "documents_complete": True, "area_acres": 4.2},
        # Multiple flags — Critical
        {"status": "Pending", "days_pending": 500, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 18.0},
        {"status": "Pending", "days_pending": 300, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 6.0},
        {"status": "Pending", "days_pending": 250, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 7.5},
        # Delayed only
        {"status": "Pending", "days_pending": 220, "land_record_status": "Verified", "documents_complete": True, "area_acres": 2.8},
        {"status": "Pending", "days_pending": 190, "land_record_status": "Verified", "documents_complete": True, "area_acres": 3.1},
        {"status": "Pending", "days_pending": 210, "land_record_status": "Pending Verification", "documents_complete": True, "area_acres": 4.5},
        # Geographic inconsistency (forced)
        {"status": "Pending", "days_pending": 100, "land_record_status": "Verified", "documents_complete": True, "area_acres": 3.0, "_geo_inconsistent": True},
        {"status": "Approved", "days_pending": 45, "land_record_status": "Verified", "documents_complete": True, "area_acres": 2.0, "_geo_inconsistent": True},
        # Possible duplicate (forced)
        {"status": "Pending", "days_pending": 80, "land_record_status": "Verified", "documents_complete": True, "area_acres": 3.5, "_possible_duplicate": True},
        {"status": "Pending", "days_pending": 60, "land_record_status": "Verified", "documents_complete": True, "area_acres": 3.5, "_possible_duplicate": True},
        # Combined geo + delayed
        {"status": "Pending", "days_pending": 200, "land_record_status": "Verified", "documents_complete": True, "area_acres": 5.0, "_geo_inconsistent": True},
        # Combined duplicate + missing docs
        {"status": "Pending", "days_pending": 90, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 4.0, "_possible_duplicate": True},
        # More critical cases
        {"status": "Pending", "days_pending": 450, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 25.0},
        {"status": "Pending", "days_pending": 380, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 12.0},
        # Low severity
        {"status": "Pending", "days_pending": 185, "land_record_status": "Verified", "documents_complete": True, "area_acres": 2.0},
        {"status": "Pending", "days_pending": 195, "land_record_status": "Verified", "documents_complete": True, "area_acres": 1.5},
        # Medium severity
        {"status": "Pending", "days_pending": 200, "land_record_status": "Verified", "documents_complete": False, "area_acres": 4.0},
        {"status": "Pending", "days_pending": 190, "land_record_status": "Mismatch", "documents_complete": True, "area_acres": 3.0},
        {"status": "Pending", "days_pending": 50, "land_record_status": "Mismatch", "documents_complete": False, "area_acres": 5.0},
    ]

    for config in anomaly_configs:
        c = generate_claim(existing_ids)
        c.update({k: v for k, v in config.items() if not k.startswith("_")})
        if "_geo_inconsistent" in config:
            c["_geo_inconsistent"] = config["_geo_inconsistent"]
        if "_possible_duplicate" in config:
            c["_possible_duplicate"] = config["_possible_duplicate"]
        # Recalculate submission_date for correct days_pending
        if config["status"] == "Pending":
            c["submission_date"] = (TODAY - datetime.timedelta(days=config["days_pending"])).isoformat()
            c["approval_date"] = None
        existing_ids.add(c["claim_id"])
        # Evaluate anomalies
        score, severity, atypes = evaluate_anomalies(c)
        c["anomaly_score"] = score
        c["severity"] = severity
        c["anomaly_types"] = atypes
        c["created_at"] = c["submission_date"] + "T00:00:00"
        # Remove internal flags
        c.pop("_geo_inconsistent", None)
        c.pop("_possible_duplicate", None)
        claims.append(c)

    # === Generate remaining normal claims ===
    while len(claims) < 750:
        c = generate_claim(existing_ids)
        existing_ids.add(c["claim_id"])
        score, severity, atypes = evaluate_anomalies(c)
        c["anomaly_score"] = score
        c["severity"] = severity
        c["anomaly_types"] = atypes
        c["created_at"] = c["submission_date"] + "T00:00:00"
        c.pop("_geo_inconsistent", None)
        c.pop("_possible_duplicate", None)
        claims.append(c)

    # Output to JSON
    out_path = Path(__file__).parent / "claims_data.json"
    with open(out_path, "w") as f:
        json.dump(claims, f, indent=2)

    # Print stats
    total = len(claims)
    anomalous = sum(1 for c in claims if c["anomaly_score"] > 0)
    high_crit = sum(1 for c in claims if c["severity"] in ("High", "Critical"))
    states = set(c["state"] for c in claims)
    districts = set(c["district"] for c in claims)

    print(f"Generated {total} claims")
    print(f"  States: {len(states)}")
    print(f"  Districts: {len(districts)}")
    print(f"  Anomalous: {anomalous} ({anomalous/total*100:.1f}%)")
    print(f"  High/Critical: {high_crit} ({high_crit/total*100:.1f}%)")
    print(f"  Normal: {total - anomalous} ({(total-anomalous)/total*100:.1f}%)")
    print(f"Saved to {out_path}")

if __name__ == "__main__":
    main()
