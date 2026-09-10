/**
 * 06 — Watching events.
 *
 * The public endpoints are HTTP-only and answer `eth_subscribe` with
 * "notifications not supported", so the SDK polls. That is not a fallback —
 * it is the only thing that works against the network's own nodes.
 *
 * Broadcasts real transactions — opt in with PURECHAIN_DEMO_WRITE=1.
 */

import { createClient, deployContract, wallet, type Log } from "purechain-sdk";
import { heading, loadCounter, note, requireWrites, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("06", "Watching for events");
  if (!requireWrites("This step")) return;

  const artifact = loadCounter();
  const signer = wallet.create();
  const client = createClient({ signer });

  try {
    const caps = await client.capabilities();
    row("eth_subscribe", caps.subscriptions ? "available" : "unavailable — polling instead");

    const { address, contract } = await deployContract(client, {
      abi: artifact.abi as never,
      bytecode: artifact.bytecode,
      args: [0n],
    });
    row("contract", address);

    // Start watching before emitting, so nothing is missed.
    const seen: Log[] = [];
    const sub = await client.watchLogs(
      contract.filter("Incremented"),
      (log) => {
        const ev = contract.decodeLog(log);
        seen.push(log);
        row(`  event #${seen.length}`, `newValue=${ev?.args.newValue} block=${log.blockNumber}`);
      },
      { pollIntervalMs: 500 },
    );

    console.log("\n  emitting three increments…");
    for (const by of [5n, 10n, 100n]) {
      await contract.writeAndWait("increment", [by]);
    }

    // Give the poller a moment to catch up with the tail.
    await new Promise((r) => setTimeout(r, 3_000));
    await sub.close();

    console.log();
    row("events delivered", seen.length);
    row("delivery ordered", seen.every((l, i) => i === 0 || l.blockNumber >= seen[i - 1]!.blockNumber));

    note(
      "The watcher tolerates idle gaps by construction: when the head has not moved " +
        "there is simply no range to scan, which is correct on a chain that stops " +
        "sealing when there is no work.",
    );

    // The same events, fetched historically rather than streamed.
    console.log();
    const history = await contract.getEvents("Incremented", { fromBlock: 0n, toBlock: "latest" });
    row("getEvents() found", history.length);
    for (const ev of history) row(`  ${ev.name}`, `newValue=${ev.args.newValue}`);

    // An indexed argument can be filtered server-side.
    const mine = await contract.getEvents("Incremented", {
      fromBlock: 0n,
      toBlock: "latest",
      args: [signer.address],
    });
    row("filtered by sender", `${mine.length} (indexed 'by' argument)`);
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
