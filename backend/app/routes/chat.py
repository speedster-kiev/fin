from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_db
from app.portfolio_service import execute_trade, get_portfolio_summary
from llm.client import chat_with_llm

router = APIRouter()

_HISTORY_LIMIT = 10


class ChatRequest(BaseModel):
    message: str


@router.post("/api/chat")
async def chat(req: ChatRequest) -> dict:
    db = await get_db()
    user_id = "default"

    await db.execute(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?,?,?)",
        (user_id, "user", req.message),
    )
    await db.commit()

    portfolio = await get_portfolio_summary(db, user_id)

    async with db.execute(
        """SELECT role, content FROM chat_messages
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (user_id, _HISTORY_LIMIT),
    ) as cur:
        history = await cur.fetchall()
    messages = [{"role": r["role"], "content": r["content"]} for r in reversed(history)]

    llm_resp = await chat_with_llm(messages, portfolio)
    assistant_msg = llm_resp.get("message", "Sorry, I couldn't process that.")

    await db.execute(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?,?,?)",
        (user_id, "assistant", assistant_msg),
    )
    await db.commit()

    trades_executed = []
    for trade in llm_resp.get("trades") or []:
        try:
            result = await execute_trade(
                db,
                trade["ticker"],
                float(trade["quantity"]),
                trade["side"],
                user_id,
            )
            trades_executed.append(result)
        except Exception as e:
            trades_executed.append({"error": str(e), "ticker": trade.get("ticker")})

    watchlist_changes: list[dict] = []
    changes = llm_resp.get("watchlist_changes") or {}
    for ticker in changes.get("add") or []:
        await db.execute(
            "INSERT OR IGNORE INTO watchlist (user_id, ticker) VALUES (?,?)",
            (user_id, ticker.upper()),
        )
        watchlist_changes.append({"action": "add", "ticker": ticker.upper()})
    for ticker in changes.get("remove") or []:
        await db.execute(
            "DELETE FROM watchlist WHERE user_id=? AND ticker=?",
            (user_id, ticker.upper()),
        )
        watchlist_changes.append({"action": "remove", "ticker": ticker.upper()})
    if watchlist_changes:
        await db.commit()

    return {
        "message": assistant_msg,
        "trades_executed": trades_executed,
        "watchlist_changes": watchlist_changes,
    }
