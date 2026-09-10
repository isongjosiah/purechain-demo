"""03 -- Reading chain state.

All read-only, so this always runs. The notable part is what a *brand new,
never-funded* account looks like -- and why that is enough to transact here.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from purechain import LogFilter, create_client, units, wallet
from shared import heading, note, row


async def main() -> None:
    heading("03", "Reading blocks, accounts and logs")

    async with create_client() as client:
        head = await client.get_block_number()
        block = await client.get_block(head)
        assert block is not None

        row("head", block.number)
        row("timestamp", datetime.fromtimestamp(block.timestamp, UTC).isoformat())
        row("transactions", len(block.transactions))
        row("gas used / limit", f"{block.gas_used} / {block.gas_limit}")
        row("base fee", f"{block.base_fee_per_gas}  (pinned to zero by genesis)")

        # `raw` carries the node's response untouched, including fields the typed
        # surface does not name.
        row("withdrawalsRoot", str(block.raw.get("withdrawalsRoot"))[:26] + "…")
        note("Cancun-era header fields are reachable through `raw` -- the typed surface never hides them.")

        stranger = wallet.create().address
        print()
        row("fresh account", stranger)
        row("balance", units.format_pcn_with_symbol(await client.get_balance(stranger)))
        row("nonce", await client.get_transaction_count(stranger))
        row("code", await client.get_code(stranger))

        note(
            "Zero balance, zero nonce -- and still able to transact, because gas is "
            "free. The SDK performs no balance pre-check before sending for exactly "
            "this reason."
        )

        print()
        by_hash = await client.get_block(block.hash)
        row("get_block(hash)", f"same block: {by_hash is not None and by_hash.number == block.number}")
        latest = await client.get_block("latest")
        row("get_block('latest')", latest.number if latest else None)

        start = head - 2000 if head > 2000 else 0
        logs = await client.get_logs(LogFilter(from_block=start, to_block=head))
        print()
        row(f"logs in {start}..{head}", len(logs))
        if logs:
            row("first log from", logs[0].address)
            row("topics", len(logs[0].topics))
            extra = [k for k in logs[0].raw if k == "transactionIndex"]
            row("raw-only fields", ", ".join(extra) or "—")


if __name__ == "__main__":
    asyncio.run(main())
