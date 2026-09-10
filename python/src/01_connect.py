"""01 -- Connect, and find out what the node can actually do.

The first thing worth internalising about this network: what a node exposes is a
property of *that node*, not of the chain. The public RPC runs with
``--http.api eth,net,web3``, so whole namespaces the client software implements
are simply absent. Check before you reach.
"""

from __future__ import annotations

import asyncio

from purechain import create_client
from shared import heading, note, row


async def main() -> None:
    heading("01", "Connect and detect capabilities")

    # No URL needed -- the geth variant defaults to the public network.
    async with create_client() as client:
        row("variant", client.variant)
        row("network", client.network.name)
        row("chain id", client.network.chain_id)
        row("currency", f"{client.network.currency_symbol} ({client.network.currency_decimals} dp)")
        row("head block", await client.get_block_number())

        caps = await client.capabilities()
        print()
        row("client", caps.client_version)
        row("namespaces", ", ".join(sorted(caps.namespaces)))
        row("zero fee", caps.zero_fee)
        row("replace-by-fee", caps.replace_by_fee)
        row("subscriptions", caps.subscriptions)
        row("validator api", caps.validator_api)

        note(
            "replace_by_fee is False because every fee is zero -- there is no 'higher "
            "fee' to replace a stuck transaction with."
        )
        note(
            "subscriptions is False because the public endpoint is HTTP-only. The SDK "
            "polls for events instead, which is why watch_logs works here at all."
        )

        print()
        for method in (
            "eth_getLogs",
            "clique_getSigners",
            "txpool_status",
            "debug_traceTransaction",
        ):
            row(method, "available" if caps.has(method) else "not exposed by this node")

        note("Reaching for an unexposed method raises MethodNotAvailableError, naming the namespace.")


if __name__ == "__main__":
    asyncio.run(main())
