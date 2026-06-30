import asyncio
import math
import random
from datetime import datetime, timezone

from .base import MarketDataProvider, PriceData

SEED_PRICES: dict[str, float] = {
    "AAPL": 190.0,
    "GOOGL": 175.0,
    "MSFT": 420.0,
    "AMZN": 185.0,
    "TSLA": 250.0,
    "NVDA": 875.0,
    "META": 520.0,
    "JPM": 200.0,
    "V": 280.0,
    "NFLX": 650.0,
}

# Market-beta per ticker for correlated moves
_BETAS: dict[str, float] = {
    "AAPL": 1.2, "GOOGL": 1.1, "MSFT": 1.0, "AMZN": 1.3,
    "TSLA": 1.8, "NVDA": 1.6, "META": 1.4, "JPM": 0.9,
    "V": 0.8, "NFLX": 1.5,
}

_SIGMA = 0.0015       # vol per 500ms step
_EVENT_PROB = 0.002   # probability of a 2-5% shock per step


class PriceSimulator(MarketDataProvider):
    def __init__(self) -> None:
        self._prices: dict[str, float] = dict(SEED_PRICES)
        self._prev: dict[str, float] = dict(SEED_PRICES)
        self._ts: dict[str, str] = {t: _now() for t in SEED_PRICES}
        self._task: asyncio.Task | None = None

    def start(self) -> asyncio.Task:
        self._task = asyncio.create_task(self._run())
        return self._task

    def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def _run(self) -> None:
        while True:
            await asyncio.sleep(0.5)
            self._tick()

    def _tick(self) -> None:
        now = _now()
        market_shock = random.gauss(0, _SIGMA)
        for ticker, price in list(self._prices.items()):
            self._prev[ticker] = price
            beta = _BETAS.get(ticker, 1.0)
            ret = beta * market_shock + random.gauss(0, _SIGMA * 0.5)
            if random.random() < _EVENT_PROB:
                ret += random.uniform(0.02, 0.05) * random.choice([-1, 1])
            self._prices[ticker] = max(price * math.exp(ret), 0.01)
            self._ts[ticker] = now

    async def get_price(self, ticker: str) -> PriceData:
        return PriceData(
            price=self._prices.get(ticker, 0.0),
            prev_price=self._prev.get(ticker, 0.0),
            timestamp=self._ts.get(ticker, _now()),
        )

    async def get_all_prices(self) -> dict[str, PriceData]:
        return {
            t: PriceData(price=self._prices[t], prev_price=self._prev[t], timestamp=self._ts[t])
            for t in self._prices
        }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
