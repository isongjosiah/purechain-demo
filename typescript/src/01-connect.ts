/**
 * 01 — Connect, and find out what the node can actually do.
 *
 * The first thing worth internalising about this network: what a node exposes
 * is a property of *that node*, not of the chain. The public RPC runs with
 * `--http.api eth,net,web3`, so whole namespaces the client software implements
 * are simply absent. Check before you reach.
 */

import { createClient } from "purechain-sdk";
import { heading, note, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("01", "Connect and detect capabilities");

  // No URL needed — the geth variant defaults to the public network.
  const client = createClient();

  try {
    await client.connect();

    row("variant", client.variant);
    row("network", client.network.name);
    row("chain id", client.network.chainId);
    row("currency", `${client.network.currencySymbol} (${client.network.currencyDecimals} dp)`);
    row("head block", await client.getBlockNumber());

    const caps = await client.capabilities();
    console.log();
    row("client", caps.clientVersion);
    row("namespaces", [...caps.namespaces].sort().join(", "));
    row("zero fee", caps.zeroFee);
    row("replace-by-fee", caps.replaceByFee);
    row("subscriptions", caps.subscriptions);
    row("validator api", caps.validatorApi);

    note(
      "replaceByFee is false because every fee is zero — there is no 'higher fee' " +
        "to replace a stuck transaction with.",
    );
    note(
      "subscriptions is false because the public endpoint is HTTP-only. The SDK " +
        "polls for events instead, which is why watchLogs works here at all.",
    );

    // Namespaces the client software implements but this endpoint does not serve.
    console.log();
    for (const method of ["eth_getLogs", "clique_getSigners", "txpool_status", "debug_traceTransaction"]) {
      row(method, caps.has(method) ? "available" : "not exposed by this node");
    }

    note("Reaching for an unexposed method throws MethodNotAvailableError, naming the namespace.");
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
