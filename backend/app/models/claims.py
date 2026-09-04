from pydantic import BaseModel
from typing import List, Optional, Any

class ClaimBase(BaseModel):
    claim_id: str
    state: str
    district: str
    latitude: float
    longitude: float
    claimant_name: str
    claim_type: str
    area_acres: float
    submission_date: str
    approval_date: Optional[str] = None
    status: str
    land_record_status: str
    documents_complete: bool
    days_pending: int = 0
    anomaly_score: int = 0
    severity: str = "Normal"
    anomaly_types: Any = []
    created_at: str = ""

    class Config:
        from_attributes = True

class ClaimListResponse(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    data: List[dict]
