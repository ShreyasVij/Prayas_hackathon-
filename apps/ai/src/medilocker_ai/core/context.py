from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from uuid import uuid4

_current: ContextVar["RequestContext | None"] = ContextVar("medilocker_request_context", default=None)


@dataclass(frozen=True)
class RequestContext:
    request_id: str
    operation: str


@contextmanager
def request_context(operation: str, request_id: str | None = None):
    ctx = RequestContext(request_id=request_id or str(uuid4()), operation=operation)
    token = _current.set(ctx)
    try:
        yield ctx
    finally:
        _current.reset(token)


def get_context() -> RequestContext | None:
    return _current.get()
