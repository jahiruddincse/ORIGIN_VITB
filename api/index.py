import sys
import os
from pathlib import Path

# Setup paths for Vercel serverless environment
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure default database path is resolved in Vercel function filesystem
os.environ.setdefault("DATABASE_PATH", str(BACKEND_DIR / "fra_monitor.db"))

from server import FRAServerHandler

class handler(FRAServerHandler):
    """
    Vercel Serverless Function entry point for VanRaksha AI REST API.
    Routes all /api/* requests directly through FRAServerHandler.
    """
    pass
