from fastapi import APIRouter, Depends
from sqlite3 import Connection
from app.database import get_db
from app.services.statistics import StatisticsService

router = APIRouter()

@router.get("/dashboard")
def get_dashboard(db: Connection = Depends(get_db)):
    return StatisticsService.get_dashboard_stats(db)
