import sqlite3
from typing import Generator
from app.config import settings

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db_connection():
    conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
    conn.row_factory = dict_factory
    return conn

def get_db() -> Generator:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
