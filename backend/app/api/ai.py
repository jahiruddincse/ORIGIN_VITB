from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlite3 import Connection
import json
from app.database import get_db
from app.ai.provider import GeminiProvider

router = APIRouter()
ai_provider = GeminiProvider()

class ClaimAnalyzeRequest(BaseModel):
    claim_id: str

class StateSummaryRequest(BaseModel):
    state: str

@router.post("/analyze-claim")
def analyze_claim(req: ClaimAnalyzeRequest, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM claims WHERE claim_id = ?", (req.claim_id,))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    row["anomaly_types"] = json.loads(row["anomaly_types"])
    
    analysis = ai_provider.analyze_claim(row)
    return analysis

@router.post("/state-summary")
def get_state_summary(req: StateSummaryRequest, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as high_priority
        FROM claims
        WHERE state = ?
    ''', (req.state,))
    stats = cursor.fetchone()
    
    if stats["total"] == 0:
        raise HTTPException(status_code=404, detail="State not found")
        
    stats["state"] = req.state
    stats["approval_rate"] = round((stats["approved"] / stats["total"]) * 100, 2)
    
    summary = ai_provider.generate_state_summary(stats)
    return {"summary": summary}
