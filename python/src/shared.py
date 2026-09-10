"""Shared helpers for the walkthrough.

Nothing here is SDK-specific -- just formatting, and the one policy decision
every step honours: steps that write to the chain are opt-in.

Mirrors ``typescript/src/shared.ts``.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent


def load_counter() -> dict[str, Any]:
    """The compiled Counter contract, shared byte-for-byte with the TypeScript demo."""
    path = _HERE.parent.parent / "contracts" / "Counter.json"
    return json.loads(path.read_text())


def heading(n: str, title: str) -> None:
    line = "─" * 64
    print(f"\n{line}\n{n}  {title}\n{line}")


def row(label: str, value: Any) -> None:
    print(f"  {label:<22} {value}")


def note(text: str) -> None:
    print(f"\n  · {text}")


def writes_enabled() -> bool:
    """Steps that broadcast transactions are gated behind this.

    Reads are free and harmless, so they always run. Writes are permanent chain
    history, so they need an explicit opt-in -- the same split the SDK's own
    test suites use.
    """
    return os.environ.get("PURECHAIN_DEMO_WRITE") == "1"


def require_writes(step: str) -> bool:
    if writes_enabled():
        return True
    print(f"\n  {step} broadcasts real transactions, so it is opt-in.")
    print("  Re-run with PURECHAIN_DEMO_WRITE=1 to execute it.")
    print("  Costs nothing: gas is free and the demo uses throwaway keys.")
    return False
