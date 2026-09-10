/**
 * Shared helpers for the walkthrough.
 *
 * Nothing here is SDK-specific — just formatting, and the one policy decision
 * every step honours: steps that write to the chain are opt-in.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** The compiled Counter contract, shared byte-for-byte with the Python demo. */
export interface Artifact {
  contractName: string;
  compiler: string;
  abi: unknown[];
  bytecode: `0x${string}`;
}

export function loadCounter(): Artifact {
  return JSON.parse(
    readFileSync(join(here, "..", "..", "contracts", "Counter.json"), "utf8"),
  ) as Artifact;
}

export function heading(n: string, title: string): void {
  console.log(`\n${"─".repeat(64)}\n${n}  ${title}\n${"─".repeat(64)}`);
}

export function row(label: string, value: unknown): void {
  console.log(`  ${label.padEnd(22)} ${String(value)}`);
}

export function note(text: string): void {
  console.log(`\n  · ${text}`);
}

/**
 * Steps that broadcast transactions are gated behind this.
 *
 * Reads are free and harmless, so they always run. Writes are permanent chain
 * history, so they need an explicit opt-in — the same split the SDK's own test
 * suites use.
 */
export function writesEnabled(): boolean {
  return process.env.PURECHAIN_DEMO_WRITE === "1";
}

export function requireWrites(step: string): boolean {
  if (writesEnabled()) return true;
  console.log(`\n  ${step} broadcasts real transactions, so it is opt-in.`);
  console.log("  Re-run with PURECHAIN_DEMO_WRITE=1 to execute it.");
  console.log("  Costs nothing: gas is free and the demo uses throwaway keys.");
  return false;
}
