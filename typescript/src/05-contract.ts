/**
 * 05 — Deploying and calling a contract.
 *
 * Uses ../contracts/Counter.json, the same artifact the Python demo deploys —
 * byte-for-byte identical ABI and bytecode.
 *
 * Broadcasts real transactions — opt in with PURECHAIN_DEMO_WRITE=1.
 */

import { CallRevertedError, Contract, createClient, deployContract, wallet } from "purechain-sdk";
import { heading, loadCounter, note, requireWrites, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("05", "Deploy a contract and call it");
  if (!requireWrites("This step")) return;

  const artifact = loadCounter();
  row("artifact", `${artifact.contractName} (${artifact.compiler.split("+")[0]})`);

  const signer = wallet.create();
  const client = createClient({ signer });

  try {
    row("deployer", `${signer.address}  (never funded)`);

    // Constructor argument: start the counter at 41.
    const { address, receipt, contract } = await deployContract(client, {
      abi: artifact.abi as never,
      bytecode: artifact.bytecode,
      args: [41n],
    });
    row("deployed at", address);
    row("in block", receipt.blockNumber);
    row("gas used", receipt.gasUsed);

    note("An account holding nothing just deployed a contract. Only free gas makes that possible.");

    // A view call — no transaction, no cost.
    console.log();
    row("count()", await contract.read<bigint>("count"));
    row("owner()", await contract.read<string>("owner"));

    // Simulate before sending: catches a revert without spending a transaction.
    const predicted = await contract.simulate<bigint>("increment", [1n], { from: signer.address });
    row("simulate increment(1)", `${predicted}  (not yet sent)`);

    // Now actually send it.
    const writeReceipt = await contract.writeAndWait("increment", [1n]);
    row("increment(1)", `mined in block ${writeReceipt.blockNumber}, status ${writeReceipt.status}`);
    row("count() now", await contract.read<bigint>("count"));

    // The receipt carries the event the contract emitted.
    const decoded = writeReceipt.logs.map((l) => contract.decodeLog(l)).filter(Boolean);
    for (const ev of decoded) {
      row(`event ${ev!.name}`, `by=${String(ev!.args.by).slice(0, 12)}… newValue=${ev!.args.newValue}`);
    }

    // A revert, with the reason string decoded from the node's error payload.
    console.log();
    try {
      await contract.simulate("increment", [0n], { from: signer.address });
      row("increment(0)", "unexpectedly succeeded");
    } catch (err) {
      if (err instanceof CallRevertedError) {
        row("increment(0)", `CallRevertedError: "${err.reason}"`);
      } else throw err;
    }

    note("The revert reason came back decoded, not as an opaque hex blob.");

    // Binding to an already-deployed address.
    console.log();
    const rebound = new Contract(address, artifact.abi as never, client);
    row("re-bound instance", await rebound.read<bigint>("count"));
  } finally {
    await client.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
