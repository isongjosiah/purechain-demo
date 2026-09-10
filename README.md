# purechain-sdk demo

A walkthrough of the PureChain SDK, written twice — once in TypeScript, once in
Python — doing the same seven things in the same order.

Both halves install the **published** packages, not local checkouts, so this is
what a real user gets. Both deploy the **same compiled contract** from
`contracts/Counter.json`, byte for byte.

```
contracts/     Counter.sol + the compiled artifact both demos deploy
typescript/    npm i purechain-sdk
python/        pip install purechain-sdk   (imports as `purechain`)
```

## Running it in Codespaces

Open the repo in a Codespace and everything installs itself — both toolchains,
both halves, from the public registries.

**No secrets or tokens are needed, including for the steps that write.** Gas is
free on PureChain and the demo generates throwaway keys, so a Codespace can
exercise the full path — deploy a contract, send transactions, watch events —
with nothing configured.

## Running it locally

**TypeScript** — needs Node 20+; source runs directly, no build step.

```bash
cd typescript && npm install && npm run all
```

**Python** — needs 3.11+.

```bash
cd python && uv sync && PYTHONPATH=src .venv/bin/python src/run_all.py
```

Steps 1, 2, 3 and 7 are read-only and always run. Steps 4, 5 and 6 **broadcast
real transactions**, so they are opt-in:

```bash
PURECHAIN_DEMO_WRITE=1 npm run all
```

That costs nothing. Gas is free on PureChain, the demo generates throwaway keys,
and every transaction moves zero value — the footprint is chain history, not
money. No faucet, no funding step.

Individual steps: `npm run 04`, or `python src/04_send.py`.

## The seven steps

| | | writes |
|---|---|---|
| 01 | Connect; detect what the node actually exposes | |
| 02 | Keys, mnemonics, keystores, addresses, units — all offline | |
| 03 | Read blocks, accounts, logs | |
| 04 | Send a zero-fee transaction; concurrent sends; finality | ✓ |
| 05 | Deploy a contract, call it, decode a revert | ✓ |
| 06 | Watch events by polling | ✓ |
| 07 | Throughput, block timing, capacity ceiling | |

## What the demo is really showing

Four things about this network break assumptions that general-purpose Ethereum
tooling builds in. Each step is arranged to make one of them visible.

**An account with nothing can do everything.** Step 5 deploys a contract from a
key generated moments earlier holding zero balance. Gas is free, so the SDK
performs no balance pre-check before sending — a check that would be wrong here.

**Fees are zero, and the oracle is never consulted.** Step 4 prints
`effectiveGasPrice: 0` from the receipt — the node confirming it, not the
library asserting it. The SDK builds and signs transactions itself precisely so
that a node with a misconfigured gas-price oracle cannot quietly turn a free
transaction into a paying one.

**Blocks are not produced on a fixed interval.** Smart Auto Mining seals only
while there is work. Step 7 usually shows a *median* block time of 1s against a
*mean* in the hundreds — one long idle gap destroys the mean. It is also why
`waitFor` defaults to inclusion rather than a confirmation count, and why a
timeout against a motionless head raises `ChainIdleError` rather than a generic
failure.

**There is no replace-by-fee.** Nothing is higher than zero, so a stuck
transaction cannot be bumped or cancelled. Step 4 fires three sends
simultaneously and shows contiguous nonces: the SDK serialises per sender,
because the usual escape hatch does not exist.

## Capabilities belong to the node, not the chain

Step 1 prints `namespaces: eth, net, rpc, web3`. The public RPC runs with
`--http.api eth,net,web3`, so `clique_*`, `txpool_*`, `admin_*` and `debug_*`
are absent even though purechain-geth implements all of them. Check
`capabilities()` before reaching for anything outside the core surface; the raw
`client.rpc(...)` escape hatch is there once you have.

## The two libraries mirror each other

Same modules, same method names modulo casing, same error codes. Running both
halves against the same contract should produce the same numbers — identical gas
used, identical revert reasons, identical block behaviour.

One difference is deliberate: Python installs as `purechain-sdk` but imports as
`purechain`, because a distribution name and an import name are separate things
there.

Building this demo surfaced a real parity bug, since fixed. In 0.0.1, addresses
decoded from contract return values came back checksummed in TypeScript and
lowercase in Python — same bytes in, different strings out, because ethers
checksums decoded addresses and eth_abi does not. As of **0.0.2** both return
the library's canonical lowercase form, and both suites pin it so they cannot
drift apart again.

The demo therefore requires 0.0.2 or newer. Worth knowing if you pin versions:
npm's `^0.0.1` matches *only* 0.0.1 — a caret on a `0.0.x` version does not
allow the next patch.

| | TypeScript | Python |
|---|---|---|
| install | `npm i purechain-sdk` | `pip install purechain-sdk` |
| import | `from "purechain-sdk"` | `import purechain` |
| style | `camelCase`, async/await | `snake_case`, async throughout |
| amounts | `bigint` | `int` |
