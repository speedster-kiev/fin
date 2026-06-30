"""Portfolio business logic shared by routes and background tasks."""
from __future__ import annotations

import aiosqlite

from app import state


async def get_portfolio_summary(
    db: aiosqlite.Connection, user_id: str = "default"
) -> dict:
    async with db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    ) as cur:
        row = await cur.fetchone()
    cash: float = row["cash_balance"] if row else 10000.0

    async with db.execute(
        "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ? AND quantity > 0",
        (user_id,),
    ) as cur:
        pos_rows = await cur.fetchall()

    positions = []
    positions_value = 0.0
    for r in pos_rows:
        pd = await state.market.get_price(r["ticker"])
        mv = pd.price * r["quantity"]
        avg_cost: float = r["avg_cost"]
        pnl = (pd.price - avg_cost) * r["quantity"]
        pnl_pct = ((pd.price - avg_cost) / avg_cost * 100) if avg_cost else 0.0
        positions_value += mv
        positions.append(
            {
                "ticker": r["ticker"],
                "quantity": r["quantity"],
                "avg_cost": avg_cost,
                "current_price": pd.price,
                "market_value": mv,
                "pnl": pnl,
                "pnl_pct": pnl_pct,
            }
        )

    return {
        "cash": cash,
        "positions_value": positions_value,
        "total_value": cash + positions_value,
        "positions": positions,
    }


async def execute_trade(
    db: aiosqlite.Connection,
    ticker: str,
    quantity: float,
    side: str,
    user_id: str = "default",
) -> dict:
    pd = await state.market.get_price(ticker)
    price = pd.price
    cost = price * quantity

    async with db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    ) as cur:
        row = await cur.fetchone()
    cash: float = row["cash_balance"] if row else 0.0

    async with db.execute(
        "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
        (user_id, ticker),
    ) as cur:
        pos = await cur.fetchone()

    if side == "buy":
        if cash < cost:
            raise ValueError("Insufficient cash")
        new_cash = cash - cost
        if pos:
            old_qty, old_avg = pos["quantity"], pos["avg_cost"]
            new_qty = old_qty + quantity
            new_avg = (old_qty * old_avg + quantity * price) / new_qty
            await db.execute(
                "UPDATE positions SET quantity=?, avg_cost=? WHERE user_id=? AND ticker=?",
                (new_qty, new_avg, user_id, ticker),
            )
        else:
            await db.execute(
                "INSERT INTO positions (user_id, ticker, quantity, avg_cost) VALUES (?,?,?,?)",
                (user_id, ticker, quantity, price),
            )
    else:
        if not pos or pos["quantity"] < quantity:
            raise ValueError("Insufficient position")
        new_cash = cash + cost
        new_qty = pos["quantity"] - quantity
        if new_qty == 0:
            await db.execute(
                "DELETE FROM positions WHERE user_id=? AND ticker=?", (user_id, ticker)
            )
        else:
            await db.execute(
                "UPDATE positions SET quantity=? WHERE user_id=? AND ticker=?",
                (new_qty, user_id, ticker),
            )

    await db.execute(
        "UPDATE users_profile SET cash_balance=? WHERE id=?", (new_cash, user_id)
    )
    await db.execute(
        "INSERT INTO trades (user_id, ticker, quantity, side, price) VALUES (?,?,?,?,?)",
        (user_id, ticker, quantity, side, price),
    )
    await db.commit()

    return {
        "ticker": ticker,
        "quantity": quantity,
        "side": side,
        "price": price,
        "cost": cost,
        "new_cash": new_cash,
    }
