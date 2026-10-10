"""Private SQLite state, atomic snapshots, fixed timeline event vocabulary."""
import json
import os
import sqlite3
from pathlib import Path
from uuid import UUID


class Store:
    def __init__(self, path):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(path, os.O_CREAT | os.O_WRONLY, 0o600)
        os.close(fd)
        self.path = path
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, state TEXT NOT NULL)")
            # Never automatically replay an interrupted investigation or approval.
            rows = db.execute("SELECT id, state FROM incidents").fetchall()
            for identifier, raw in rows:
                state = json.loads(raw)
                if state["status"] in ("investigating", "recovering"):
                    from datetime import UTC, datetime
                    state["status"] = "failed"
                    state["events"].append({"at": datetime.now(UTC).isoformat(), "event": "process_interrupted"})
                    db.execute("UPDATE incidents SET state=? WHERE id=?", (json.dumps(state), identifier))

    def save(self, state):
        with sqlite3.connect(self.path) as db:
            db.execute("INSERT OR REPLACE INTO incidents VALUES (?, ?)", (state["incident_id"], json.dumps(state, allow_nan=False)))

    def get(self, identifier):
        try:
            UUID(identifier)
        except ValueError:
            raise KeyError(identifier) from None
        with sqlite3.connect(self.path) as db:
            row = db.execute("SELECT state FROM incidents WHERE id=?", (identifier,)).fetchone()
        if row is None:
            raise KeyError(identifier)
        return json.loads(row[0])

    def history(self):
        with sqlite3.connect(self.path) as db:
            rows = db.execute("SELECT state FROM incidents ORDER BY rowid DESC LIMIT 10").fetchall()
        return [{"incident_id": s["incident_id"], "status": s["status"]} for s in map(lambda r: json.loads(r[0]), rows)]
