import asyncio
from datetime import datetime, timezone

import httpx

from .base import MarketDataProvider, PriceData
from .simulator import SEED_PRICES

_MASSIVE_BASE = "https://api.massive.markets/v1"
_POLL_INTERVAL = 0.5


class MassivePollingClient(MarketDataProvider):
    """REST-polling adapter for the MASSIVE market data API."""

    def __init__(self, api_key: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=_MASSIVE_BASE,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5.0,
        )
        self._cache: dict[str, PriceData] = {
            t: PriceData(price=p, prev_price=p, timestamp=_now())
            for t, p in SEED_PRICES.items()
        }
        self._tickers = list(SEED_PRICES.keys())
        self._task: asyncio.Task | None = None

    def start(self) -> asyncio.Task:
        self._task = asyncio.create_task(self._poll_loop())
        return self._task

    def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def close(self) -> None:
        self.stop()
        await self._client.aclose()

    async def _poll_loop(self) -> None:
        while True:
            await asyncio.sleep(_POLL_INTERVAL)
            await self._fetch_all()

    async def _fetch_all(self) -> None:
        try:
            resp = await self._client.get(
                "/quotes", params={"symbols": ",".join(self._tickers)}
            )
            resp.raise_for_status()
            for item in resp.json().get("quotes", []):
                ticker = item["symbol"]
                prev = self._cache[ticker].price if ticker in self._cache else item["price"]
                self._cache[ticker] = PriceData(
                    price=float(item["price"]),
                    prev_price=float(prev),
                    timestamp=item.get("timestamp", _now()),
                )
        except Exception:
            pass  # keep stale cache on transient errors

    async def get_price(self, ticker: str) -> PriceData:
        return self._cache.get(
            ticker,
            PriceData(price=0.0, prev_price=0.0, timestamp=_now()),
        )

    async def get_all_prices(self) -> dict[str, PriceData]:
        return dict(self._cache)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
