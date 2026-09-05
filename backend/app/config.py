import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Direct loader for .env and .env.local
base = Path(__file__).resolve().parent.parent
for ep in [base / ".env.local", base.parent / ".env.local", base / ".env", base.parent / ".env"]:
    if ep.exists():
        try:
            with open(ep, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass

class Config:
    PROJECT_NAME = "FRA Decision Support System"
    API_V1_STR = "/api"
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("LLM_API_KEY", ""))
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    DB_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "fra_monitor.db"))
    DELAY_THRESHOLD_DAYS = int(os.getenv("DELAY_THRESHOLD_DAYS", "180"))

settings = Config()
