"""Deprecated historical reconciliation entry point.

There is no Mongo-to-Supabase transfer to reconcile for the clean-start
architecture. New application data is created directly in Supabase.
"""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Historical reconciliation disabled for the clean Supabase start")
    parser.parse_args()
    raise SystemExit(
        "MongoDB reconciliation is disabled because historical MongoDB data is not migrated."
    )


if __name__ == "__main__":
    main()
