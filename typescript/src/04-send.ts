/**
 * 04 — Sending a transaction.
 *
 * Two things differ from a normal EVM chain, and both are defaults rather than
 * options: the gas-price oracle is never consulted, and `waitFor` waits for
 * inclusion rather than a confirmation count.
 *
 * Broadcasts real transactions — opt in with PURECHAIN_DEMO_WRITE=1.
 */

import { ChainIdleError, createClient, units, wallet } from "purechain-sdk";
import { heading, note, requireWrites, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("04", "Sending a zero-fee transaction");
  if (!requireWrites("This step")) return;

  // A key created seconds ago, holding nothing. That is sufficient here.
  const signer = wallet.create();
  const client = createClient({ signer });

  try {
    row("from", signer.address);
    row("balance", units.formatPCNWithSymbol(await client.getBalance(signer.address)));

    const started = Date.now();
    const hash = await client.sendTransaction({ to: signer.address, value: 0n });
    row("submitted in", `${Date.now() - started} ms`);
    row("hash", hash);

    // Default is `until: "included"`. Asking for depth on a chain that goes
    // quiet immediately afterwards could never resolve — Smart Auto Mining
    // stops sealing when there is no work.
    const receipt = await client.waitFor(hash, { timeoutMs: 60_000 });
    row("mined in", `${Date.now() - started} ms`);
    row("block", receipt.blockNumber);
    row("status", receipt.status);
    row("gas used", receipt.gasUsed);
    row("effective gas price", `${receipt.effectiveGasPrice}  ← the node confirming it cost nothing`);

    const tx = await client.getTransaction(hash);
    row("signed gasPrice", tx?.gasPrice);

    console.log();
    row("balance after", units.formatPCNWithSymbol(await client.getBalance(signer.address)));
    row("nonce after", await client.getTransactionCount(signer.address));

    note("The balance never moved. Gas is free, so sending cost nothing at all.");

    // Concurrency: the SDK serialises sends per account, because at zero fees a
    // nonce collision has no remedy — you cannot replace a stuck transaction.
    console.log();
    const hashes = await Promise.all([
      client.sendTransaction({ to: signer.address, value: 0n }),
      client.sendTransaction({ to: signer.address, value: 0n }),
      client.sendTransaction({ to: signer.address, value: 0n }),
    ]);
    await Promise.all(hashes.map((h) => client.waitFor(h, { timeoutMs: 60_000 })));
    const nonces = (await Promise.all(hashes.map((h) => client.getTransaction(h))))
      .map((t) => t?.nonce)
      .sort((a, b) => Number((a ?? 0n) - (b ?? 0n)));
    row("3 concurrent sends", `nonces ${nonces.join(", ")} — sequential, no gaps`);

    note("Fired simultaneously; the per-sender lock kept the nonces contiguous.");

    // Waiting for depth is possible, but bounded and distinguishable from failure.
    console.log();
    try {
      await client.waitFor(hashes[0]!, { until: "final", confirmations: 2, timeoutMs: 15_000 });
      row("until: 'final'", "reached 2 confirmations");
    } catch (err) {
      if (err instanceof ChainIdleError) {
        row("until: 'final'", "ChainIdleError — the chain went quiet, which is not a fault");
      } else throw err;
    }
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
