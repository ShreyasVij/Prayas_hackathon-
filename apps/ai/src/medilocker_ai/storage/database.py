from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Any

from ..core.config import get_settings
from ..core.safety import StorageError

try:
    from pymongo import MongoClient
except ImportError:  # pragma: no cover
    MongoClient = None  # type: ignore[assignment]


class Database:
    def __init__(self) -> None:
        self._client: Any = None
        self._db: Any = None

    def _connect(self) -> Any:
        if self._db is not None:
            return self._db
        settings = get_settings()
        if not settings.mongodb_uri:
            raise StorageError("MONGODB_URI is not configured")
        if MongoClient is None:
            raise StorageError("pymongo is not installed")
        try:
            client = MongoClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=10_000,
                connectTimeoutMS=10_000,
                socketTimeoutMS=30_000,
                tlsAllowInvalidCertificates=False,
            )
            client.admin.command("ping")
            self._client = client
            self._db = client.get_database(settings.mongodb_db)
            return self._db
        except Exception as exc:
            raise StorageError("Unable to connect to MongoDB") from exc

    def collection(self, name: str) -> Any:
        return self._connect().get_collection(name)

    async def find_one(self, name: str, query: dict[str, Any]) -> dict[str, Any] | None:
        return await asyncio.to_thread(self.collection(name).find_one, query)

    async def find_many(self, name: str, query: dict[str, Any], *, limit: int = 100, sort: list[tuple[str, int]] | None = None) -> list[dict[str, Any]]:
        def run() -> list[dict[str, Any]]:
            cursor = self.collection(name).find(query)
            if sort:
                cursor = cursor.sort(sort)
            return list(cursor.limit(max(0, limit)))
        return await asyncio.to_thread(run)

    async def upsert(self, name: str, query: dict[str, Any], document: dict[str, Any]) -> None:
        collection = self.collection(name)
        payload = dict(document)
        await asyncio.to_thread(collection.update_one, query, {"$set": payload}, upsert=True)

    async def update(self, name: str, query: dict[str, Any], update: dict[str, Any]) -> None:
        await asyncio.to_thread(self.collection(name).update_one, query, update)


@lru_cache(maxsize=1)
def get_database() -> Database:
    return Database()
