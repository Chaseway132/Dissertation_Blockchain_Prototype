#!/bin/sh
set -e

echo "==> Starting local EVM Blockchain Node on 0.0.0.0:8545..."
npx hardhat node --hostname 0.0.0.0 --port 8545 &
NODE_PID=$!
trap 'kill "$NODE_PID" 2>/dev/null || true' INT TERM

echo "==> Waiting for node JSON-RPC to become responsive..."
NODE_READY=0
for i in $(seq 1 30); do
  if wget -q -O /dev/null --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header='Content-Type: application/json' http://127.0.0.1:8545 2>/dev/null; then
    echo "==> Blockchain node is LIVE!"
    NODE_READY=1
    break
  fi
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    wait "$NODE_PID"
    exit 1
  fi
  sleep 1
done

if [ "$NODE_READY" -ne 1 ]; then
  echo "==> Blockchain node did not become ready within 30 seconds." >&2
  exit 1
fi

echo "==> Deploying Charity DAO contracts to local node..."
npx hardhat run charity-dao-contracts/scripts/deploy.js --network localhost

echo "==> Contracts deployed successfully. Node is running for incoming RPC traffic..."
wait "$NODE_PID"
