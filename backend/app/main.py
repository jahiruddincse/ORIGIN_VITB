from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import dashboard, claims, states, anomalies, analytics, filters, ai
from app.database import get_db_connection

app = FastAPI(title="FRA Decision Support System API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure DB is accessible
@app.on_event("startup")
def startup_db_client():
    conn = get_db_connection()
    conn.execute("SELECT 1")
    conn.close()

# Include Routers
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(claims.router, prefix="/api", tags=["claims"])
app.include_router(states.router, prefix="/api", tags=["states"])
app.include_router(anomalies.router, prefix="/api", tags=["anomalies"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(filters.router, prefix="/api/filters", tags=["filters"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
