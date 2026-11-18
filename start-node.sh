#!/bin/sh
set -e

echo "==> Starting Ganache on 0.0.0.0:8545..."
npx ganache --host 0.0.0.0 --port 8545 --chain.chainId 1337 --wallet.mnemonic "lens test gauge page panther diagram dial slide meadow jazz action exercise" &
GANACHE_PID=$!
trap 'kill "$GANACHE_PID" 2>/dev/null || true' INT TERM

echo "==> Waiting for Ganache JSON-RPC to become responsive..."
GANACHE_READY=0
for i in $(seq 1 30); do
  if wget -q -O /dev/null --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header='Content-Type: application/json' http://127.0.0.1:8545 2>/dev/null; then
    echo "==> Ganache JSON-RPC is LIVE!"
    GANACHE_READY=1
    break
  fi
  if ! kill -0 "$GANACHE_PID" 2>/dev/null; then
    wait "$GANACHE_PID"
    exit 1
  fi
  sleep 1
done

if [ "$GANACHE_READY" -ne 1 ]; then
  echo "==> Ganache did not become ready within 30 seconds." >&2
  exit 1
fi

echo "==> Deploying Charity DAO contracts to Ganache..."
npx hardhat run charity-dao-contracts/scripts/deploy.js --network ganache

echo "==> Contracts deployed successfully. Ganache is running for incoming RPC traffic..."
wait "$GANACHE_PID"
