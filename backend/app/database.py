import os

import aiosqlite

DB_PATH = os.getenv("DB_PATH", "finally.db")

SEED_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    assert _db is not None, "Database not initialised"
    return _db


async def init_db() -> None:
    global _db
    _db = await aiosqlite.connect(DB_PATH)
    _db.row_factory = aiosqlite.Row
    await _create_schema()
    await _seed()


async def close_db() -> None:
    global _db
    if _db:
        await _db.close()
        _db = None


async def _create_schema() -> None:
    await _db.executescript("""
        CREATE TABLE IF NOT EXISTS users_profile (
            id           TEXT PRIMARY KEY,
            cash_balance REAL NOT NULL DEFAULT 10000.0,
            created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS watchlist (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id  TEXT NOT NULL,
            ticker   TEXT NOT NULL,
            added_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, ticker)
        );

        CREATE TABLE IF NOT EXISTS positions (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id  TEXT NOT NULL,
            ticker   TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            avg_cost REAL NOT NULL DEFAULT 0,
            UNIQUE(user_id, ticker)
        );

        CREATE TABLE IF NOT EXISTS trades (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT NOT NULL,
            ticker      TEXT NOT NULL,
            quantity    REAL NOT NULL,
            side        TEXT NOT NULL,
            price       REAL NOT NULL,
            executed_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS portfolio_snapshots (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          TEXT NOT NULL,
            total_value      REAL NOT NULL,
            cash_balance     REAL NOT NULL,
            positions_value  REAL NOT NULL,
            snapshot_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT NOT NULL,
            role       TEXT NOT NULL,
            content    TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    await _db.commit()


async def _seed() -> None:
    await _db.execute(
        "INSERT OR IGNORE INTO users_profile (id, cash_balance) VALUES (?, ?)",
        ("default", 10000.0),
    )
    for ticker in SEED_TICKERS:
        await _db.execute(
            "INSERT OR IGNORE INTO watchlist (user_id, ticker) VALUES (?, ?)",
            ("default", ticker),
        )
    await _db.commit()
