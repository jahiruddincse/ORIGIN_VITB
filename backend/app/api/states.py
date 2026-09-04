from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from app.database import get_db

router = APIRouter()

@router.get("/states")
def list_states(db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
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
    ''')
    rows = cursor.fetchall()
    for row in rows:
        row["approval_rate"] = round((row["approved"] / row["total"]) * 100, 2) if row["total"] > 0 else 0
    return rows

@router.get("/states/{state}")
def get_state(state: str, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            district,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies
        FROM claims
        WHERE state = ?
        GROUP BY district
    ''', (state,))
    districts = cursor.fetchall()
    
    if not districts:
        raise HTTPException(status_code=404, detail="State not found")
        
    cursor.execute("SELECT COUNT(*) as total FROM claims WHERE state = ?", (state,))
    total = cursor.fetchone()["total"]
    
    return {
        "state": state,
        "total_claims": total,
        "districts": districts
    }

@router.get("/districts/{district}")
def get_district(district: str, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN anomaly_score > 0 THEN 1 ELSE 0 END) as anomalies
        FROM claims
        WHERE district = ?
    ''', (district,))
    stats = cursor.fetchone()
    
    if stats["total"] == 0:
        raise HTTPException(status_code=404, detail="District not found")
        
    return {
        "district": district,
        "stats": stats
    }
