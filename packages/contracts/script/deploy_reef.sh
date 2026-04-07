#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"
ORIGINAL_REEF_RPC_URL="${REEF_RPC_URL-}"
ORIGINAL_REEF_CHAIN_ID="${REEF_CHAIN_ID-}"
ORIGINAL_PRIVATE_KEY="${PRIVATE_KEY-}"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -n "$ORIGINAL_REEF_RPC_URL" ]]; then
  export REEF_RPC_URL="$ORIGINAL_REEF_RPC_URL"
fi

if [[ -n "$ORIGINAL_REEF_CHAIN_ID" ]]; then
  export REEF_CHAIN_ID="$ORIGINAL_REEF_CHAIN_ID"
fi

if [[ -n "$ORIGINAL_PRIVATE_KEY" ]]; then
  export PRIVATE_KEY="$ORIGINAL_PRIVATE_KEY"
fi

CONFIG_RPC_URL="$(node --input-type=module -e "import { resolveNodeAppConfig } from '@reef/config'; console.log(resolveNodeAppConfig({ cwd: process.argv[1] }).network.rpcUrl)" "$ROOT_DIR")"
CONFIG_CHAIN_ID="$(node --input-type=module -e "import { resolveNodeAppConfig } from '@reef/config'; console.log(resolveNodeAppConfig({ cwd: process.argv[1] }).network.chainId)" "$ROOT_DIR")"

RPC_URL="${REEF_RPC_URL:-$CONFIG_RPC_URL}"
CHAIN_ID="${REEF_CHAIN_ID:-$CONFIG_CHAIN_ID}"
PRIVATE_KEY="${PRIVATE_KEY:?PRIVATE_KEY is required}"
SOLC_BINARY="${SOLC_BINARY:-$(command -v solc)}"

if [[ "$RPC_URL" == *"host.docker.internal"* ]]; then
  RPC_URL="${RPC_URL//host.docker.internal/127.0.0.1}"
fi

if [[ -z "$SOLC_BINARY" ]]; then
  echo "solc is required but was not found on PATH."
  exit 1
fi

export REEF_RPC_URL="$RPC_URL"
export REEF_CHAIN_ID="$CHAIN_ID"

echo "Building the Reef OpenSea-compatible contract stack..."
forge build \
  --root "$CONTRACTS_DIR" \
  --use "$SOLC_BINARY"

echo "Running Reef RPC deployment probe..."
PRIVATE_KEY="$PRIVATE_KEY" \
node "$CONTRACTS_DIR/script/probe_reef_rpc.mjs"

echo "Attempting official OpenSea contract bootstrap..."
if ! PRIVATE_KEY="$PRIVATE_KEY" node "$CONTRACTS_DIR/script/deploy_standard_seaport.mjs"; then
  echo "Official Seaport bootstrap failed on this Reef RPC. Continuing toward fallback-aware runtime deployment."
fi

echo "Attempting official SeaDrop creator stack deployment..."
if ! PRIVATE_KEY="$PRIVATE_KEY" node "$CONTRACTS_DIR/script/deploy_opensea_stack.mjs"; then
  echo "Official SeaDrop creator stack failed on this Reef RPC. Continuing toward fallback-aware runtime deployment."
fi

echo "Publishing canonical Reef runtime capability artifact..."
PRIVATE_KEY="$PRIVATE_KEY" \
node "$CONTRACTS_DIR/script/deploy_runtime_stack.mjs"

echo "Runtime capability artifact written to $CONTRACTS_DIR/deployments/reef-runtime-${CHAIN_ID}.json"
