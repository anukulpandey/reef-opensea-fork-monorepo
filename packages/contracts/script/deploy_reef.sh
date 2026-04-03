#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"

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

KEYLESS_DEPLOYER_ADDRESS="0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1"
KEYLESS_CREATE2_ADDRESS="0x7A0D94F55792C434d74a40883C6ed8545E406D12"
KEYLESS_CREATE2_DEPLOYMENT_TRANSACTION="0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"

echo "Attempting canonical CREATE2 bootstrap support check..."
CURRENT_CODE="$(cast code --rpc-url "$RPC_URL" "$KEYLESS_CREATE2_ADDRESS")"

if [[ "$CURRENT_CODE" == "0x" ]]; then
  KEYLESS_DEPLOYER_BALANCE="$(cast balance --rpc-url "$RPC_URL" "$KEYLESS_DEPLOYER_ADDRESS")"
  if (( KEYLESS_DEPLOYER_BALANCE < 10000000000000000 )); then
    echo "Reef Chain does not currently expose the keyless CREATE2 deployer. Funding the deployer address for compatibility..."
    cast send --legacy --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --value 0.01ether "$KEYLESS_DEPLOYER_ADDRESS"
  else
    echo "Keyless deployer address is already funded, skipping the funding transfer."
  fi
  if ! cast publish --rpc-url "$RPC_URL" "$KEYLESS_CREATE2_DEPLOYMENT_TRANSACTION"; then
    echo "Canonical deployment is not supported by the current Reef Chain RPC. Falling back to standard deployment addresses."
  fi
fi

if [[ "$(cast code --rpc-url "$RPC_URL" "$KEYLESS_CREATE2_ADDRESS")" == "0x" ]]; then
  echo "Deploying Seaport 1.6 and ConduitController at standard addresses..."
  node "$CONTRACTS_DIR/script/deploy_standard_seaport.mjs"

  SEAPORT_ADDRESS="$(node -p "require('$CONTRACTS_DIR/deployments/reef-bootstrap-${CHAIN_ID}.json').seaport")"
  CONDUIT_CONTROLLER_ADDRESS="$(node -p "require('$CONTRACTS_DIR/deployments/reef-bootstrap-${CHAIN_ID}.json').conduitController")"
else
  echo "Canonical CREATE2 deployer became available, so the foundry deployer will use canonical addresses."
  SEAPORT_ADDRESS=""
  CONDUIT_CONTROLLER_ADDRESS=""
fi

echo "Building Reef contracts for an older EVM target that Reef accepts..."
forge build \
  --root "$CONTRACTS_DIR" \
  --use "$SOLC_BINARY"

echo "Deploying the Reef collection and writing deployment metadata..."
PRIVATE_KEY="$PRIVATE_KEY" \
SEAPORT_ADDRESS="$SEAPORT_ADDRESS" \
CONDUIT_CONTROLLER_ADDRESS="$CONDUIT_CONTROLLER_ADDRESS" \
node "$CONTRACTS_DIR/script/deploy_collection_direct.mjs"

echo "Deployment artifact written to $CONTRACTS_DIR/deployments/reef-${CHAIN_ID}.json"
