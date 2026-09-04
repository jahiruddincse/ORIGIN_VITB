from fastapi import APIRouter, Depends, Query, HTTPException
from sqlite3 import Connection
import json
from app.database import get_db

router = APIRouter()

@router.get("/anomalies")
def list_anomalies(
    limit: int = Query(20, ge=1, le=100),
    db: Connection = Depends(get_db)
):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM claims WHERE anomaly_score > 0 ORDER BY anomaly_score DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    for row in rows:
        row["anomaly_types"] = json.loads(row["anomaly_types"])
    return rows

@router.get("/anomalies/{claim_id}")
def get_anomaly_detail(claim_id: str, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if row["anomaly_score"] == 0:
        return {"claim_id": claim_id, "has_anomaly": False}
        
    row["anomaly_types"] = json.loads(row["anomaly_types"])
    return {
        "claim_id": claim_id,
        "has_anomaly": True,
        "score": row["anomaly_score"],
        "severity": row["severity"],
        "types": row["anomaly_types"],
        "claim_details": row
    }
