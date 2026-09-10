/**
 * 02 — Keys, entirely offline.
 *
 * Nothing here touches the network. That matters more than usual on PureChain:
 * gas is free, so a key created here can transact immediately with no funding
 * step, no faucet, and no balance.
 */

import { address, units, wallet } from "purechain-sdk";
import { heading, note, row } from "./shared.ts";

export async function main(): Promise<void> {
  heading("02", "Wallets, addresses and units — no network involved");

  // A throwaway key.
  const fresh = wallet.create();
  row("wallet.create()", fresh.address);

  // A recovery phrase, and the account it derives.
  const { signer, mnemonic } = wallet.createWithMnemonic();
  row("mnemonic", mnemonic.split(" ").slice(0, 3).join(" ") + " … (12 words)");
  row("derived", signer.address);

  // Derivation is standard BIP-44 coin type 60, so an imported phrase gives the
  // same addresses MetaMask would show.
  const accounts = wallet.deriveAccounts(mnemonic, 3);
  accounts.forEach((a, i) => row(`  m/44'/60'/0'/0/${i}`, a.address));

  note(`Derivation path is ${wallet.DEFAULT_HD_PATH}/<index> — the Ethereum standard.`);

  // Keystore round-trip. Deliberately slow: scrypt is what makes guessing the
  // password expensive.
  console.log();
  const keystore = await wallet.toKeystore(signer, "correct horse battery staple");
  row("keystore", `v${JSON.parse(keystore).version} JSON, ${keystore.length} chars`);
  const restored = await wallet.fromKeystore(keystore, "correct horse battery staple");
  row("restored", `${restored.address}  ${restored.address === signer.address ? "✓ matches" : "✗"}`);

  // Signing and verification, still offline.
  console.log();
  const signature = await signer.signMessage("gm");
  row("signMessage", signature.slice(0, 26) + "…");
  row("recovered", wallet.recoverMessageAddress("gm", signature));
  row("verifies", wallet.verifyMessage("gm", signature, signer.address));
  row("tampered msg", wallet.verifyMessage("gn", signature, signer.address));

  // Address helpers.
  console.log();
  row("checksummed", address.checksum(signer.address));
  row("normalized", address.normalize(address.checksum(signer.address)));
  row("equals (mixed)", address.equals(signer.address, address.checksum(signer.address)));

  // Units. Amounts are bigint everywhere — never floats.
  console.log();
  row("parsePCN('1.5')", units.parsePCN("1.5"));
  row("formatPCN", units.formatPCNWithSymbol(units.parsePCN("1.5")));
  const sum = units.parsePCN("0.1") + units.parsePCN("0.2");
  row("0.1 + 0.2", `${units.formatPCN(sum)}  (exact — bigint, not float)`);

  note("0.1 + 0.2 !== 0.3 in binary floating point. On a balance that is a real loss.");
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
