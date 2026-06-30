import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app import state
from app.database import close_db, get_db, init_db
from app.routes import chat, health, portfolio, stream, watchlist

_STATIC_DIR = Path(__file__).parent.parent / "static"
_SNAPSHOT_INTERVAL = 30  # seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    api_key = os.getenv("MASSIVE_API_KEY")
    if api_key:
        from market.massive import MassivePollingClient

        provider = MassivePollingClient(api_key)
        provider.start()
    else:
        from market.simulator import PriceSimulator

        provider = PriceSimulator()
        provider.start()
    state.market = provider

    snap_task = asyncio.create_task(_snapshot_loop())

    yield

    snap_task.cancel()
    provider.stop()
    if hasattr(provider, "close"):
        await provider.close()
    await close_db()


async def _snapshot_loop() -> None:
    while True:
        await asyncio.sleep(_SNAPSHOT_INTERVAL)
        try:
            from app.portfolio_service import get_portfolio_summary

            db = await get_db()
            summary = await get_portfolio_summary(db)
            await db.execute(
                """INSERT INTO portfolio_snapshots
                   (user_id, total_value, cash_balance, positions_value)
                   VALUES (?, ?, ?, ?)""",
                ("default", summary["total_value"], summary["cash"], summary["positions_value"]),
            )
            await db.commit()
        except asyncio.CancelledError:
            raise
        except Exception:
            pass


app = FastAPI(title="FinAlly", lifespan=lifespan)

app.include_router(health.router)
app.include_router(stream.router)
app.include_router(portfolio.router)
app.include_router(watchlist.router)
app.include_router(chat.router)

if _STATIC_DIR.exists():
    _assets = _STATIC_DIR / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def _spa_fallback(full_path: str) -> FileResponse:
        index = _STATIC_DIR / "index.html"
        return FileResponse(str(index))
