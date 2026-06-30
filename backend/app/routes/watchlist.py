from fastapi import APIRouter
from pydantic import BaseModel

from app import state
from app.database import get_db

router = APIRouter()


class AddRequest(BaseModel):
    ticker: str


@router.get("/api/watchlist")
async def get_watchlist() -> list:
    db = await get_db()
    async with db.execute(
        "SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY added_at",
        ("default",),
    ) as cur:
        rows = await cur.fetchall()

    result = []
    for r in rows:
        pd = await state.market.get_price(r["ticker"])
        result.append(
            {
                "ticker": r["ticker"],
                "price": pd.price,
                "prev_price": pd.prev_price,
                "timestamp": pd.timestamp,
            }
        )
    return result


@router.post("/api/watchlist")
async def add_watchlist(req: AddRequest) -> dict:
    db = await get_db()
    ticker = req.ticker.upper()
    await db.execute(
        "INSERT OR IGNORE INTO watchlist (user_id, ticker) VALUES (?, ?)",
        ("default", ticker),
    )
    await db.commit()
    return {"ticker": ticker, "added": True}


@router.delete("/api/watchlist/{ticker}")
async def remove_watchlist(ticker: str) -> dict:
    db = await get_db()
    ticker = ticker.upper()
    await db.execute(
        "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
        ("default", ticker),
    )
    await db.commit()
    return {"ticker": ticker, "removed": True}
