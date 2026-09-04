from fastapi import APIRouter, Depends
from sqlite3 import Connection
from app.database import get_db

router = APIRouter()

@router.get("/state")
def get_state_analytics(db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            state, 
            COUNT(*) as total_claims,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_claims
        FROM claims
        GROUP BY state
    ''')
    rows = cursor.fetchall()
    
    labels = []
    data_total = []
    data_approved = []
    
    for r in rows:
        labels.append(r["state"])
        data_total.append(r["total_claims"])
        data_approved.append(r["approved_claims"])
        
    return {
        "labels": labels,
        "datasets": [
            {"label": "Total Claims", "data": data_total},
            {"label": "Approved Claims", "data": data_approved}
        ]
    }
