#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.env"
  set +a
fi

CONFIG_RPC_URL="$(node --input-type=module -e "import { resolveNodeAppConfig } from '@reef/config'; console.log(resolveNodeAppConfig({ cwd: process.argv[1] }).network.rpcUrl)" "$ROOT_DIR")"
CONFIG_CHAIN_ID="$(node --input-type=module -e "import { resolveNodeAppConfig } from '@reef/config'; console.log(resolveNodeAppConfig({ cwd: process.argv[1] }).network.chainId)" "$ROOT_DIR")"

RPC_URL="${REEF_RPC_URL:-$CONFIG_RPC_URL}"
CHAIN_ID="${REEF_CHAIN_ID:-$CONFIG_CHAIN_ID}"
PRIVATE_KEY="${PRIVATE_KEY:?PRIVATE_KEY is required}"
SOLC_BINARY="${SOLC_BINARY:-$(command -v solc)}"

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

echo "Probe succeeded. Bootstrapping canonical Seaport + ConduitController..."
PRIVATE_KEY="$PRIVATE_KEY" \
node "$CONTRACTS_DIR/script/deploy_standard_seaport.mjs"

echo "Deploying SeaDrop, Reef creator factory, collection, and the Seaport trade gate..."
PRIVATE_KEY="$PRIVATE_KEY" \
node "$CONTRACTS_DIR/script/deploy_opensea_stack.mjs"

echo "Live deployment artifact written to $CONTRACTS_DIR/deployments/reef-${CHAIN_ID}.json"
