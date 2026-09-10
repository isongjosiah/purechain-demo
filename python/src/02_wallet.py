"""02 -- Keys, entirely offline.

Nothing here touches the network. That matters more than usual on PureChain: gas
is free, so a key created here can transact immediately with no funding step, no
faucet, and no balance.
"""

from __future__ import annotations

import asyncio
import json

from purechain import address, units, wallet
from shared import heading, note, row


async def main() -> None:
    heading("02", "Wallets, addresses and units -- no network involved")

    fresh = wallet.create()
    row("wallet.create()", fresh.address)

    generated = wallet.create_with_mnemonic()
    words = generated.mnemonic.split()
    row("mnemonic", " ".join(words[:3]) + f" … ({len(words)} words)")
    row("derived", generated.signer.address)

    # Derivation is standard BIP-44 coin type 60, so an imported phrase gives the
    # same addresses MetaMask would show.
    for i, acct in enumerate(wallet.derive_accounts(generated.mnemonic, 3)):
        row(f"  m/44'/60'/0'/0/{i}", acct.address)

    note(f"Derivation path is {wallet.DEFAULT_HD_PATH}/<index> -- the Ethereum standard.")

    # Keystore round-trip. Deliberately slow: scrypt is what makes guessing the
    # password expensive.
    print()
    keystore = wallet.to_keystore(generated.signer, "correct horse battery staple")
    row("keystore", f"v{json.loads(keystore)['version']} JSON, {len(keystore)} chars")
    restored = wallet.from_keystore(keystore, "correct horse battery staple")
    ok = "✓ matches" if restored.address == generated.signer.address else "✗"
    row("restored", f"{restored.address}  {ok}")

    # Signing and verification, still offline.
    print()
    signature = await generated.signer.sign_message("gm")
    row("sign_message", signature[:26] + "…")
    row("recovered", wallet.recover_message_address("gm", signature))
    row("verifies", wallet.verify_message("gm", signature, generated.signer.address))
    row("tampered msg", wallet.verify_message("gn", signature, generated.signer.address))

    print()
    checksummed = address.checksum(generated.signer.address)
    row("checksummed", checksummed)
    row("normalized", address.normalize(checksummed))
    row("equals (mixed)", address.equals(generated.signer.address, checksummed))

    # Units. Amounts are int everywhere -- never floats.
    print()
    row("parse_pcn('1.5')", units.parse_pcn("1.5"))
    row("format_pcn", units.format_pcn_with_symbol(units.parse_pcn("1.5")))
    total = units.parse_pcn("0.1") + units.parse_pcn("0.2")
    row("0.1 + 0.2", f"{units.format_pcn(total)}  (exact -- int, not float)")

    note("0.1 + 0.2 != 0.3 in binary floating point. On a balance that is a real loss.")


if __name__ == "__main__":
    asyncio.run(main())
