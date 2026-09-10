/**
 * 03 — Reading chain state.
 *
 * All read-only, so this always runs. The notable part is what a *brand new,
 * never-funded* account looks like — and why that is enough to transact here.
 */

import { createClient, units, wallet } from "purechain-sdk";
import { heading, note, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("03", "Reading blocks, accounts and logs");

  const client = createClient();

  try {
    const head = await client.getBlockNumber();
    const block = await client.getBlock(head);
    if (!block) throw new Error("no head block");

    row("head", block.number);
    row("timestamp", new Date(Number(block.timestamp) * 1000).toISOString());
    row("transactions", block.transactions.length);
    row("gas used / limit", `${block.gasUsed} / ${block.gasLimit}`);
    row("base fee", `${block.baseFeePerGas}  (pinned to zero by genesis)`);

    // `raw` carries the node's response untouched, including fields the typed
    // surface does not name.
    row("withdrawalsRoot", String(block.raw.withdrawalsRoot).slice(0, 26) + "…");
    note("Cancun-era header fields are reachable through `raw` — the typed surface never hides them.");

    // A key that has never touched the chain.
    const stranger = wallet.create().address;
    console.log();
    row("fresh account", stranger);
    row("balance", `${units.formatPCNWithSymbol(await client.getBalance(stranger))}`);
    row("nonce", await client.getTransactionCount(stranger));
    row("code", await client.getCode(stranger));

    note(
      "Zero balance, zero nonce — and still able to transact, because gas is free. " +
        "The SDK performs no balance pre-check before sending for exactly this reason.",
    );

    // Blocks can be addressed by height, hash or tag.
    console.log();
    const byHash = await client.getBlock(block.hash);
    row("getBlock(hash)", `same block: ${byHash?.number === block.number}`);
    row("getBlock('latest')", (await client.getBlock("latest"))?.number);

    // Logs over a bounded range.
    const from = head > 2000n ? head - 2000n : 0n;
    const logs = await client.getLogs({ fromBlock: from, toBlock: head });
    console.log();
    row(`logs in ${from}..${head}`, logs.length);
    if (logs[0]) {
      row("first log from", logs[0].address);
      row("topics", logs[0].topics.length);
      row("raw-only fields", Object.keys(logs[0].raw).filter((k) => k === "transactionIndex").join(", ") || "—");
    }
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
