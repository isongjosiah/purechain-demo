"""05 -- Deploying and calling a contract.

Uses ../../contracts/Counter.json, the same artifact the TypeScript demo
deploys -- byte-for-byte identical ABI and bytecode.

Broadcasts real transactions -- opt in with PURECHAIN_DEMO_WRITE=1.
"""

from __future__ import annotations

import asyncio

from purechain import CallRevertedError, Contract, create_client, deploy_contract, wallet
from shared import heading, load_counter, note, require_writes, row


async def main() -> None:
    heading("05", "Deploy a contract and call it")
    if not require_writes("This step"):
        return

    artifact = load_counter()
    row("artifact", f"{artifact['contractName']} ({artifact['compiler'].split('+')[0]})")

    signer = wallet.create()

    async with create_client(signer=signer) as client:
        row("deployer", f"{signer.address}  (never funded)")

        # Constructor argument: start the counter at 41.
        result = await deploy_contract(
            client, abi=artifact["abi"], bytecode=artifact["bytecode"], args=[41]
        )
        row("deployed at", result.address)
        row("in block", result.receipt.block_number)
        row("gas used", result.receipt.gas_used)

        note("An account holding nothing just deployed a contract. Only free gas makes that possible.")

        contract = result.contract

        # A view call -- no transaction, no cost.
        print()
        row("count()", await contract.read("count"))
        row("owner()", await contract.read("owner"))

        # Simulate before sending: catches a revert without spending a transaction.
        predicted = await contract.simulate("increment", [1], from_=signer.address)
        row("simulate increment(1)", f"{predicted}  (not yet sent)")

        write_receipt = await contract.write_and_wait("increment", [1])
        row("increment(1)", f"mined in block {write_receipt.block_number}, status {write_receipt.status}")
        row("count() now", await contract.read("count"))

        for log in write_receipt.logs:
            event = contract.decode_log(log)
            if event is not None:
                row(
                    f"event {event.name}",
                    f"by={str(event.args['by'])[:12]}… newValue={event.args['newValue']}",
                )

        # A revert, with the reason string decoded from the node's error payload.
        print()
        try:
            await contract.simulate("increment", [0], from_=signer.address)
            row("increment(0)", "unexpectedly succeeded")
        except CallRevertedError as err:
            row("increment(0)", f'CallRevertedError: "{err.reason}"')

        note("The revert reason came back decoded, not as an opaque hex blob.")

        # Binding to an already-deployed address.
        print()
        rebound = Contract(result.address, artifact["abi"], client)
        row("re-bound instance", await rebound.read("count"))


if __name__ == "__main__":
    asyncio.run(main())
