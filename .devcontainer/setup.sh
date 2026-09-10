#!/usr/bin/env bash
set -euo pipefail

echo "node   $(node --version)"
echo "python $(python3 --version)"

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

# Both halves install the published packages from npm and PyPI, not local
# checkouts. That is deliberate: the demo should show what a real user gets.
( cd typescript && npm install )
( cd python && uv venv && uv pip install -e . )

cat <<'EOF'

  purechain-sdk demo — ready

  Both halves are installed from the public registries, so this is what a real
  user gets. They do the same seven things in the same order.

    TypeScript                       Python
    cd typescript                    cd python
    npm run all                      PYTHONPATH=src .venv/bin/python src/run_all.py

  Steps 1, 2, 3 and 7 are read-only and always run. Steps 4, 5 and 6 BROADCAST
  real transactions, so they are opt-in:

    PURECHAIN_DEMO_WRITE=1 npm run all

  That costs nothing and needs no secrets. Gas is free on PureChain, the demo
  generates throwaway keys, and every transaction moves zero value — so a
  Codespace can exercise the full write path with nothing configured.

EOF
