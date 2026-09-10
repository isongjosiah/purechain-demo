/**
 * Runs the whole walkthrough in order.
 *
 * Read-only steps always run. Write steps announce themselves and skip unless
 * PURECHAIN_DEMO_WRITE=1 is set.
 */

import { writesEnabled } from "./shared.ts";

const steps = [
  ["01", () => import("./01-connect.ts")],
  ["02", () => import("./02-wallet.ts")],
  ["03", () => import("./03-read.ts")],
  ["04", () => import("./04-send.ts")],
  ["05", () => import("./05-contract.ts")],
  ["06", () => import("./06-events.ts")],
  ["07", () => import("./07-metrics.ts")],
] as const;

console.log("purechain-sdk — TypeScript walkthrough");
console.log(writesEnabled() ? "writes ENABLED — this will broadcast transactions" : "read-only (set PURECHAIN_DEMO_WRITE=1 to include write steps)");

for (const [name, load] of steps) {
  try {
    await (await load()).main();
  } catch (err) {
    console.error(`\n  step ${name} failed:`, err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

console.log("\n" + "─".repeat(64));
console.log("done");
