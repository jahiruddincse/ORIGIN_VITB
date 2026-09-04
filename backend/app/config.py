import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Config:
    PROJECT_NAME = "FRA Decision Support System"
    API_V1_STR = "/api"
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("LLM_API_KEY", ""))
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    DB_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "fra_monitor.db"))
    DELAY_THRESHOLD_DAYS = int(os.getenv("DELAY_THRESHOLD_DAYS", "180"))

settings = Config()
