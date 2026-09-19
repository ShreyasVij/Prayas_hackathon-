"""Deprecated historical migration entry point.

MediLocker now starts fresh on Supabase. Historical MongoDB data is intentionally
not imported. This module remains only to fail safely if an old deployment
attempts to invoke the former migration command.
"""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Mongo migration disabled for the clean Supabase start")
    parser.parse_args()
    raise SystemExit(
        "MongoDB data migration is disabled. Supabase is the only application database."
    )


if __name__ == "__main__":
    main()
