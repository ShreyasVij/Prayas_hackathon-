from __future__ import annotations

from medilocker_ai.api import create_app
from medilocker_ai.core.config import get_settings

app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host=settings.host, port=settings.port)
