"""Typed helpers for booking business audit payloads."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BookingSlot:
    date: str | None
    time: str | None

    def as_dict(self) -> dict[str, str | None]:
        return {"date": self.date, "time": self.time}


@dataclass(frozen=True)
class BookingPricing:
    price: str | None
    discount: str | None
    coupon: str | None = None


@dataclass(frozen=True)
class ModificationContext:
    reason: str
    before: dict[str, Any]
    after: dict[str, Any]
    version: int
