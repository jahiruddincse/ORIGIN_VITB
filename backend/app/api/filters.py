from fastapi import APIRouter, Depends
from sqlite3 import Connection
from app.database import get_db

router = APIRouter()

@router.get("/")
def get_filters(db: Connection = Depends(get_db)):
    cursor = db.cursor()
    
    cursor.execute("SELECT DISTINCT state FROM claims ORDER BY state")
    states = [row["state"] for row in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT district FROM claims ORDER BY district")
    districts = [row["district"] for row in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT status FROM claims ORDER BY status")
    statuses = [row["status"] for row in cursor.fetchall()]
    
    cursor.execute("SELECT DISTINCT severity FROM claims ORDER BY severity")
    severities = [row["severity"] for row in cursor.fetchall()]
    
    # Pre-defined known anomaly types for filter
    anomaly_types = [
        "DELAYED_CLAIM", 
        "LAND_RECORD_MISMATCH", 
        "INCOMPLETE_DOCUMENTATION", 
        "UNUSUALLY_LARGE_AREA",
        "RAPID_APPROVAL",
        "UNJUSTIFIED_REJECTION_SUSPECTED"
    ]
    
    return {
        "states": states,
        "districts": districts,
        "statuses": statuses,
        "severities": severities,
        "anomaly_types": anomaly_types
    }
