from __future__ import annotations

import asyncio
import logging

from .handlers import JobHandlers
from .queue import WebJobQueue

logger = logging.getLogger(__name__)


async def run_once() -> bool:
    queue = WebJobQueue()
    handlers = JobHandlers()
    job = await queue.claim()
    if not job:
        return False
    result = await handlers.handle(job)
    await queue.complete(result)
    return True


async def worker_loop(interval_seconds: float = 2.0) -> None:
    while True:
        try:
            processed = await run_once()
            if not processed:
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("AI worker iteration failed")
            await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    asyncio.run(worker_loop())
