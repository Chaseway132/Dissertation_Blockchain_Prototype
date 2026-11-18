#!/bin/sh
set -e

echo "==> Starting Ganache on 127.0.0.1:8546..."
npx ganache --host 127.0.0.1 --port 8546 --chain.chainId 1337 --chain.hardfork berlin --wallet.mnemonic "lens test gauge page panther diagram dial slide meadow jazz action exercise" &
GANACHE_PID=$!

echo "==> Starting the RPC and health-check proxy on 0.0.0.0:8545..."
node ./rpc-proxy.js &
PROXY_PID=$!

cleanup() {
  kill "$GANACHE_PID" "$PROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "==> Waiting for Ganache JSON-RPC to become responsive..."
GANACHE_READY=0
for i in $(seq 1 30); do
  if wget -q -O /dev/null --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header='Content-Type: application/json' http://127.0.0.1:8546 2>/dev/null; then
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
