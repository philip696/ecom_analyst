#!/usr/bin/env python3
"""Rewrite the demo user's password to pbkdf2_sha256 for the Worker bundle.

Pyodide cannot install the bcrypt wheel; the vendored app falls back to pbkdf2
when bcrypt is missing, but existing bcrypt hashes in SQLite would never verify.
Deploy runs this after copying ecommerce.db so demo@example.com still uses demo1234.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

from passlib.context import CryptContext

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: rehash_demo_password_pyodide.py <sqlite.db>", file=sys.stderr)
        return 2
    db_path = Path(sys.argv[1]).resolve()
    if not db_path.is_file():
        print(f"not found: {db_path}", file=sys.stderr)
        return 1

    ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    new_hash = ctx.hash(DEMO_PASSWORD)

    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (new_hash, DEMO_EMAIL),
        )
        n = cur.rowcount
        conn.commit()
    finally:
        conn.close()

    if n == 0:
        print(f"no user with email {DEMO_EMAIL!r}; skipped", file=sys.stderr)
    else:
        print(f"updated {n} user(s) to pbkdf2_sha256 for Pyodide worker")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
