/**
 * 07 — Measuring the chain.
 *
 * Read-only, so this always runs. It is also where PureChain's behaviour is
 * least like a normal EVM chain, and where a naive measurement misleads worst.
 */

import { createClient, metrics } from "purechain-sdk";
import { heading, note, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("07", "Throughput, block timing and capacity");

  const client = createClient();

  try {
    const summary = await metrics.summary(client, { lookback: 200 });
    const { throughput: t, timing, gas } = summary;

    row("sampled", `${summary.sample.blocks} blocks (${summary.sample.fromBlock}..${summary.sample.toBlock})`);
    row("transactions", t.transactions);

    console.log();
    row("wall-clock TPS", t.wallClockTps.toFixed(4));
    row("active TPS", t.activeTps.toFixed(4));
    row("peak TPS", t.peakTps.toFixed(2));
    row("idle / active", `${t.idleSeconds}s idle, ${t.activeSeconds}s active`);

    note(
      "Wall-clock throughput collapses across idle periods. Under Smart Auto Mining " +
        "the chain stops sealing when there is no work, so 'active' is the figure " +
        "comparable to a benchmark — reporting only wall-clock would make a healthy " +
        "chain look broken.",
    );

    console.log();
    row("median block time", `${timing.medianSeconds}s`);
    row("mean block time", `${timing.meanSeconds.toFixed(1)}s`);
    row("idle gaps", timing.idleGaps);
    row("longest gap", `${timing.longestGapSeconds}s`);

    note(
      "Compare median against mean. One long pause destroys the mean, which is why " +
        "the SDK reports a median and counts the gaps separately.",
    );

    console.log();
    row("gas limit", gas.gasLimit);
    row("mean utilisation", `${(gas.meanUtilization * 100).toFixed(4)}%`);
    row("empty blocks", `${gas.emptyBlocks}/${summary.sample.blocks} (${(gas.emptyBlockRatio * 100).toFixed(1)}%)`);

    console.log();
    row("ceiling", `${t.ceiling.theoreticalMaxTps} TPS`);
    row("  from", `${t.ceiling.gasLimit} gas / ${t.ceiling.gasPerTransfer} per transfer`);
    row("  = per block", `${t.ceiling.maxTransfersPerBlock} transfers`);
    row("ceiling reached", `${(t.ceilingUtilization * 100).toFixed(3)}%`);

    note(
      "Every throughput figure carries its ceiling, so a workload limit is " +
        "distinguishable from a network limit. Published figures for this chain were " +
        "measured on a genesis with an effectively unbounded gas limit; the live " +
        "network is capped, so the numbers are not directly comparable.",
    );

    note(
      "Passive observation of a quiet chain says nothing about capacity. To measure " +
        "that you have to generate load — see benchmark.throughput().",
    );
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
