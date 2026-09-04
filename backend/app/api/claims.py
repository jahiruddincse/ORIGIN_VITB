from fastapi import APIRouter, Depends, HTTPException, Query
from sqlite3 import Connection
from typing import Optional
import json
from app.database import get_db
from app.models.claims import ClaimListResponse

router = APIRouter()

@router.get("/claims", response_model=ClaimListResponse)
def list_claims(
    state: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Connection = Depends(get_db)
):
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
        query += " AND (claimant_name LIKE ? OR claim_id LIKE ?)"
        count_query += " AND (claimant_name LIKE ? OR claim_id LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
        
    cursor = db.cursor()
    cursor.execute(count_query, params)
    total = cursor.fetchone()["total"]
    
    offset = (page - 1) * limit
    query += f" LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    for row in rows:
        row["anomaly_types"] = json.loads(row["anomaly_types"])
        
    pages = (total + limit - 1) // limit
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "data": rows
    }

@router.get("/claims/{claim_id}")
def get_claim(claim_id: str, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Claim not found")
    row["anomaly_types"] = json.loads(row["anomaly_types"])
    return row
