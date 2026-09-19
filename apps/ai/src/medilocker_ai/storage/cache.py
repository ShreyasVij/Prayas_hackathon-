from __future__ import annotations

import time
from typing import Any


class MemoryCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        item = self._data.get(key)
        if not item:
            return None
        expires_at, value = item
        if expires_at <= time.time():
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        self._data[key] = (time.time() + ttl_seconds, value)
