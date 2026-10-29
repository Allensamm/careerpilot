"""Optional PostgreSQL storage for encrypted cloud packages."""
import os
import json
import re
import time
import psycopg

def enabled():
    return bool(os.environ.get("DATABASE_URL"))

def connection():
    conn = psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=10)
    conn.execute("CREATE TABLE IF NOT EXISTS careerpilot_packages (id VARCHAR(32) PRIMARY KEY, record JSONB NOT NULL, expires_at BIGINT NOT NULL)")
    conn.commit()
    return conn

def check(pid):
    if not re.fullmatch(r"[a-f0-9]{32}", pid):
        raise ValueError("Invalid package ID")

def read(pid):
    check(pid)
    with connection() as conn:
        row = conn.execute("SELECT record FROM careerpilot_packages WHERE id=%s", (pid,)).fetchone()
        return row[0] if row else None

def write(pid, record):
    check(pid)
    with connection() as conn:
        conn.execute("INSERT INTO careerpilot_packages (id,record,expires_at) VALUES (%s,%s::jsonb,%s) ON CONFLICT(id) DO UPDATE SET record=EXCLUDED.record,expires_at=EXCLUDED.expires_at", (pid,json.dumps(record),record["expires_at"]))

def delete(pid):
    check(pid)
    with connection() as conn:
        conn.execute("DELETE FROM careerpilot_packages WHERE id=%s", (pid,))

def count():
    with connection() as conn:
        return conn.execute("SELECT COUNT(*) FROM careerpilot_packages").fetchone()[0]

def ids():
    with connection() as conn:
        return [row[0] for row in conn.execute("SELECT id FROM careerpilot_packages")]

def purge():
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM careerpilot_packages WHERE expires_at<=%s", (int(time.time()),))
            return cursor.rowcount
