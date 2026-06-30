from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PriceData:
    price: float
    prev_price: float
    timestamp: str


class MarketDataProvider(ABC):
    @abstractmethod
    async def get_price(self, ticker: str) -> PriceData: ...

    @abstractmethod
    async def get_all_prices(self) -> dict[str, PriceData]: ...
