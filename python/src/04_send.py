"""04 -- Sending a transaction.

Two things differ from a normal EVM chain, and both are defaults rather than
options: the gas-price oracle is never consulted, and ``wait_for`` waits for
inclusion rather than a confirmation count.

Broadcasts real transactions -- opt in with PURECHAIN_DEMO_WRITE=1.
"""

from __future__ import annotations

import asyncio
import time

from purechain import ChainIdleError, TxRequest, WaitOptions, create_client, units, wallet
from shared import heading, note, require_writes, row


async def main() -> None:
    heading("04", "Sending a zero-fee transaction")
    if not require_writes("This step"):
        return

    # A key created seconds ago, holding nothing. That is sufficient here.
    signer = wallet.create()

    async with create_client(signer=signer) as client:
        row("from", signer.address)
        row("balance", units.format_pcn_with_symbol(await client.get_balance(signer.address)))

        started = time.monotonic()
        tx_hash = await client.send_transaction(TxRequest(to=signer.address, value=0))
        row("submitted in", f"{(time.monotonic() - started) * 1000:.0f} ms")
        row("hash", tx_hash)

        # Default is until="included". Asking for depth on a chain that goes quiet
        # immediately afterwards could never resolve -- Smart Auto Mining stops
        # sealing when there is no work.
        receipt = await client.wait_for(tx_hash, WaitOptions(timeout=60.0))
        row("mined in", f"{(time.monotonic() - started) * 1000:.0f} ms")
        row("block", receipt.block_number)
        row("status", receipt.status)
        row("gas used", receipt.gas_used)
        row("effective gas price", f"{receipt.effective_gas_price}  ← the node confirming it cost nothing")

        tx = await client.get_transaction(tx_hash)
        row("signed gasPrice", tx.gas_price if tx else None)

        print()
        row("balance after", units.format_pcn_with_symbol(await client.get_balance(signer.address)))
        row("nonce after", await client.get_transaction_count(signer.address))

        note("The balance never moved. Gas is free, so sending cost nothing at all.")

        # Concurrency: the SDK serialises sends per account, because at zero fees a
        # nonce collision has no remedy -- you cannot replace a stuck transaction.
        print()
        hashes = await asyncio.gather(
            *(client.send_transaction(TxRequest(to=signer.address, value=0)) for _ in range(3))
        )
        await asyncio.gather(*(client.wait_for(h, WaitOptions(timeout=60.0)) for h in hashes))
        txs = await asyncio.gather(*(client.get_transaction(h) for h in hashes))
        nonces = sorted(t.nonce for t in txs if t is not None)
        row("3 concurrent sends", f"nonces {', '.join(map(str, nonces))} — sequential, no gaps")

        note("Fired simultaneously; the per-sender lock kept the nonces contiguous.")

        print()
        try:
            await client.wait_for(
                hashes[0], WaitOptions(until="final", confirmations=2, timeout=15.0)
            )
            row("until='final'", "reached 2 confirmations")
        except ChainIdleError:
            row("until='final'", "ChainIdleError — the chain went quiet, which is not a fault")


if __name__ == "__main__":
    asyncio.run(main())
