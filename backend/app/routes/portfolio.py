from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.portfolio_service import execute_trade, get_portfolio_summary

router = APIRouter()


class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str


@router.get("/api/portfolio")
async def get_portfolio() -> dict:
    db = await get_db()
    return await get_portfolio_summary(db)


@router.post("/api/portfolio/trade")
async def trade(req: TradeRequest) -> dict:
    if req.side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")

    db = await get_db()
    try:
        return await execute_trade(db, req.ticker.upper(), req.quantity, req.side)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/portfolio/history")
async def portfolio_history() -> list:
    db = await get_db()
    async with db.execute(
        """SELECT total_value, cash_balance, positions_value, snapshot_at
           FROM portfolio_snapshots
           WHERE user_id = ?
           ORDER BY snapshot_at DESC
           LIMIT 288""",
        ("default",),
    ) as cur:
        rows = await cur.fetchall()
    return [
        {
            "total_value": r["total_value"],
            "cash_balance": r["cash_balance"],
            "positions_value": r["positions_value"],
            "timestamp": r["snapshot_at"],
        }
        for r in reversed(rows)
    ]
