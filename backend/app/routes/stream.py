import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app import state

router = APIRouter()


@router.get("/api/stream/prices")
async def stream_prices() -> StreamingResponse:
    async def _generator():
        while True:
            try:
                prices = await state.market.get_all_prices()
                payload = {
                    ticker: {
                        "price": pd.price,
                        "prev_price": pd.prev_price,
                        "timestamp": pd.timestamp,
                    }
                    for ticker, pd in prices.items()
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
