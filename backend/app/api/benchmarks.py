"""
VanRaksha AI — Official FRA Benchmark Reference Layer Router
Provides state-level aggregate statistics from the Ministry of Tribal Affairs (MoTA).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from app.database import get_db

router = APIRouter()

@router.get('/benchmarks')
def get_benchmarks(db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('SELECT * FROM fra_official_benchmarks ORDER BY claims_received_total DESC')
    rows = [dict(r) for r in cursor.fetchall()]
    
    total_claims = sum(b.get('claims_received_total', 0) for b in rows)
    total_titles = sum(b.get('titles_distributed_total', 0) for b in rows)
    total_acres = sum(b.get('forest_land_extent_acres', 0.0) for b in rows)
    avg_rate = round((total_titles / total_claims * 100), 1) if total_claims else 0.0

    return {
        'source': 'Ministry of Tribal Affairs (MoTA), Government of India',
        'source_url': 'https://tribal.nic.in/FRA.aspx',
        'reporting_date': '2026-03-31',
        'data_provenance': 'OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)',
        'national_summary': {
            'states_covered': len(rows),
            'total_claims_received': total_claims,
            'total_titles_distributed': total_titles,
            'total_forest_land_extent_acres': total_acres,
            'overall_title_distribution_rate_pct': avg_rate
        },
        'states': rows
    }

@router.get('/benchmarks/{state}')
def get_state_benchmark(state: str, db: Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute('SELECT * FROM fra_official_benchmarks WHERE state = ?', (state,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f'Official benchmark not found for state: {state}')
    res = dict(row)
    res['data_provenance'] = 'OFFICIAL FRA AGGREGATE BENCHMARK (Government of India)'
    return res
