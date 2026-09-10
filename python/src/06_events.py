"""06 -- Watching events.

The public endpoints are HTTP-only and answer ``eth_subscribe`` with
"notifications not supported", so the SDK polls. That is not a fallback -- it is
the only thing that works against the network's own nodes.

Broadcasts real transactions -- opt in with PURECHAIN_DEMO_WRITE=1.
"""

from __future__ import annotations

import asyncio

from purechain import Log, WatchOptions, create_client, deploy_contract, wallet
from shared import heading, load_counter, note, require_writes, row


async def main() -> None:
    heading("06", "Watching for events")
    if not require_writes("This step"):
        return

    artifact = load_counter()
    signer = wallet.create()

    async with create_client(signer=signer) as client:
        caps = await client.capabilities()
        row("eth_subscribe", "available" if caps.subscriptions else "unavailable — polling instead")

        result = await deploy_contract(
            client, abi=artifact["abi"], bytecode=artifact["bytecode"], args=[0]
        )
        contract = result.contract
        row("contract", result.address)

        # Start watching before emitting, so nothing is missed.
        seen: list[Log] = []

        def on_log(log: Log) -> None:
            event = contract.decode_log(log)
            seen.append(log)
            value = event.args["newValue"] if event else "?"
            row(f"  event #{len(seen)}", f"newValue={value} block={log.block_number}")

        sub = await client.watch_logs(
            contract.filter("Incremented"), on_log, WatchOptions(poll_interval=0.5)
        )

        print("\n  emitting three increments…")
        for by in (5, 10, 100):
            await contract.write_and_wait("increment", [by])

        # Give the poller a moment to catch up with the tail.
        await asyncio.sleep(3)
        await sub.close()

        print()
        row("events delivered", len(seen))
        ordered = all(
            seen[i].block_number >= seen[i - 1].block_number for i in range(1, len(seen))
        )
        row("delivery ordered", ordered)

        note(
            "The watcher tolerates idle gaps by construction: when the head has not "
            "moved there is simply no range to scan, which is correct on a chain that "
            "stops sealing when there is no work."
        )

        print()
        history = await contract.get_events("Incremented", from_block=0, to_block="latest")
        row("get_events() found", len(history))
        for event in history:
            row(f"  {event.name}", f"newValue={event.args['newValue']}")

        mine = await contract.get_events(
            "Incremented", from_block=0, to_block="latest", args=[signer.address]
        )
        row("filtered by sender", f"{len(mine)} (indexed 'by' argument)")


if __name__ == "__main__":
    asyncio.run(main())
