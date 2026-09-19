from __future__ import annotations

import logging
import sys

from .config import get_settings


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        from .context import get_context
        context = get_context()
        record.request_id = context.request_id if context else "-"
        return True


def configure_logging() -> None:
    root = logging.getLogger()
    level = getattr(logging, get_settings().log_level.upper(), logging.INFO)
    root.setLevel(level)

    if root.handlers:
        for handler in root.handlers:
            handler.addFilter(RequestIdFilter())
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
    ))
    root.addHandler(handler)
