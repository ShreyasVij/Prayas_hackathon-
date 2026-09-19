from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from medilocker_ai.runtime.client import RuntimeClient


async def main() -> None:
    result = await RuntimeClient().generate_text("Return the word OK.", max_output_tokens=20)
    if not result.text.strip():
        raise SystemExit("Model runtime returned empty output")
    print({"provider": result.provider, "model": result.model, "ok": True})


if __name__ == "__main__":
    asyncio.run(main())
