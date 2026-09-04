from fastapi import APIRouter, Depends, Query
from sqlite3 import Connection
from app.database import get_db
from app.services.statistics import StatisticsService

router = APIRouter()

@router.get("/dashboard")
def get_dashboard(db: Connection = Depends(get_db)):
    return StatisticsService.get_dashboard_stats(db)


@router.get("/map/districts")
def get_district_geojson(db: Connection = Depends(get_db)):
    return StatisticsService.get_district_geojson(db)


@router.get("/priority-districts")
def get_priority_districts(
    limit: int = Query(8, ge=1, le=20),
    db: Connection = Depends(get_db),
):
    return StatisticsService.get_priority_districts(db, limit)
