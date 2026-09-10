"""Runs the whole walkthrough in order.

Read-only steps always run. Write steps announce themselves and skip unless
PURECHAIN_DEMO_WRITE=1 is set.
"""

from __future__ import annotations

import asyncio
import importlib
import sys

from shared import writes_enabled

STEPS = [
    "01_connect",
    "02_wallet",
    "03_read",
    "04_send",
    "05_contract",
    "06_events",
    "07_metrics",
]


async def main() -> None:
    print("purechain-sdk — Python walkthrough")
    print(
        "writes ENABLED — this will broadcast transactions"
        if writes_enabled()
        else "read-only (set PURECHAIN_DEMO_WRITE=1 to include write steps)"
    )

    failed = False
    for name in STEPS:
        try:
            await importlib.import_module(name).main()
        except Exception as err:  # noqa: BLE001 - one step failing should not stop the tour
            print(f"\n  step {name} failed: {err}")
            failed = True

    print("\n" + "─" * 64)
    print("done")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
