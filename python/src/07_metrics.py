"""07 -- Measuring the chain.

Read-only, so this always runs. It is also where PureChain's behaviour is least
like a normal EVM chain, and where a naive measurement misleads worst.
"""

from __future__ import annotations

import asyncio

from purechain import create_client, metrics
from shared import heading, note, row


async def main() -> None:
    heading("07", "Throughput, block timing and capacity")

    async with create_client() as client:
        summary = await metrics.summary(client, lookback=200)
        t, timing, gas = summary.throughput, summary.timing, summary.gas
        s = summary.sample

        row("sampled", f"{len(s.blocks)} blocks ({s.from_block}..{s.to_block})")
        row("transactions", t.transactions)

        print()
        row("wall-clock TPS", f"{t.wall_clock_tps:.4f}")
        row("active TPS", f"{t.active_tps:.4f}")
        row("peak TPS", f"{t.peak_tps:.2f}")
        row("idle / active", f"{t.idle_seconds}s idle, {t.active_seconds}s active")

        note(
            "Wall-clock throughput collapses across idle periods. Under Smart Auto "
            "Mining the chain stops sealing when there is no work, so 'active' is the "
            "figure comparable to a benchmark -- reporting only wall-clock would make "
            "a healthy chain look broken."
        )

        print()
        row("median block time", f"{timing.median_seconds}s")
        row("mean block time", f"{timing.mean_seconds:.1f}s")
        row("idle gaps", timing.idle_gaps)
        row("longest gap", f"{timing.longest_gap_seconds}s")

        note(
            "Compare median against mean. One long pause destroys the mean, which is "
            "why the SDK reports a median and counts the gaps separately."
        )

        print()
        row("gas limit", gas.gas_limit)
        row("mean utilisation", f"{gas.mean_utilization * 100:.4f}%")
        row(
            "empty blocks",
            f"{gas.empty_blocks}/{len(s.blocks)} ({gas.empty_block_ratio * 100:.1f}%)",
        )

        print()
        row("ceiling", f"{t.ceiling.theoretical_max_tps:.0f} TPS")
        row("  from", f"{t.ceiling.gas_limit} gas / {t.ceiling.gas_per_transfer} per transfer")
        row("  = per block", f"{t.ceiling.max_transfers_per_block} transfers")
        row("ceiling reached", f"{t.ceiling_utilization * 100:.3f}%")

        note(
            "Every throughput figure carries its ceiling, so a workload limit is "
            "distinguishable from a network limit. Published figures for this chain "
            "were measured on a genesis with an effectively unbounded gas limit; the "
            "live network is capped, so the numbers are not directly comparable."
        )

        note(
            "Passive observation of a quiet chain says nothing about capacity. To "
            "measure that you have to generate load -- see benchmark.throughput()."
        )


if __name__ == "__main__":
    asyncio.run(main())
