from __future__ import annotations

import secrets


def verify_bearer_token(authorization: str | None, expected_token: str) -> bool:
    if not authorization or not expected_token:
        return False
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        return False
    supplied = authorization[len(prefix):].strip()
    return bool(supplied) and secrets.compare_digest(supplied, expected_token)
