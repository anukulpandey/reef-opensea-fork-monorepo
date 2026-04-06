# Reef OpenSea + Sqwid Migration Monorepo

This repo now has two real layers:

- the existing OpenSea-style frontend shell and Docker-backed local infra
- a Phase 0 OpenSea-compatible contract gate for Reef that must pass before the Sqwid-style creator/profile/mint/sell migration can continue

The migration is intentionally blocked on live Reef deployment, exactly as requested.

## Current Status

The local app stack works:

- Web: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:4002](http://localhost:4002)
- IPFS API: [http://localhost:5002](http://localhost:5002)
- IPFS gateway: [http://localhost:8081/ipfs](http://localhost:8081/ipfs)
- Postgres: `localhost:5432`

What is working locally:

- Docker Compose stack
- Postgres-backed API
- local IPFS node
- shared config package
- OpenSea-style shell UI
- honest empty states instead of dummy market data
- OpenSea-compatible Phase 0 contract sources and deployment scripts

What is blocked:

- live Reef deployment on `http://34.123.142.246:8545`
- the Sqwid-style feature port that depends on that successful deployment

The latest probe artifact is [reef-probe-13939.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/deployments/reef-probe-13939.json).

As of April 4, 2026, the latest Phase 0 deployment attempt failed with:

- RPC: `http://34.123.142.246:8545`
- error: `connect ECONNREFUSED 34.123.142.246:8545`

Because the plan was gated on successful deployment and bytecode verification, the migration stops there until the Reef RPC is reachable and accepts contract creation.

## Repo Layout

- `apps/web`
  - React + Vite frontend
  - current OpenSea-style shell
- `apps/api`
  - Express API
  - Postgres + IPFS integrations
  - current live-backed read API
- `packages/config`
  - single source of truth for network, services, storage, and contract addresses
- `packages/contracts`
  - legacy Reef contracts still present
  - new OpenSea-compatible Phase 0 contracts and scripts
- `external/projectopensea`
  - vendored public OpenSea repos used as reference sources
- `storage`
  - bind-mounted local storage for Postgres/IPFS/public assets

## Phase 0 Contract Gate

The new gate is based on public OpenSea primitives plus repo-owned Reef glue:

- [ReefDeploymentProbe.sol](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/src/ReefDeploymentProbe.sol)
  - minimal deployment probe
- [deploy_standard_seaport.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_standard_seaport.mjs)
  - canonical `ConduitController`
  - canonical `Seaport`
- official `SeaDrop` compiled from vendored ProjectOpenSea source
- [ReefSeaDropCollection.sol](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/src/ReefSeaDropCollection.sol)
  - SeaDrop-compatible ERC721 collection
  - creator-owned metadata config
  - owner mint helper
- [ReefCreatorFactory.sol](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/src/ReefCreatorFactory.sol)
  - deploys creator collection clones
  - configures base URI, contract URI, payout address, royalties, and public mint window
- [deploy_opensea_stack.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_opensea_stack.mjs)
  - deploys SeaDrop + factory
  - creates one collection
  - mints one NFT
  - attempts one Seaport listing + fulfillment

## Shared Config

The shared config lives in [base-config.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/config/base-config.json) and is resolved by [index.js](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/config/index.js).

It now includes:

- Reef network metadata
- service URLs
- storage paths
- `seaport`
- `conduitController`
- `seaDrop`
- `creatorFactory`
- `collectionImplementation`
- `collection`
- legacy `marketplace` fields still kept for the older app path

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Build contracts and apps:

```bash
npm run contracts:build
npm run build
```

3. Start the local stack:

```bash
docker compose up --build -d
```

4. Smoke-check the routes:

```bash
npm run smoke:routes
```

## Contract Commands

### Probe only

```bash
npm run contracts:probe:reef
```

This deploys a minimal probe and checks whether bytecode can be retrieved.

### Full Phase 0 gate

```bash
npm run contracts:deploy:reef
```

This now:

- builds contracts
- runs the probe first
- aborts immediately if the probe fails
- bootstraps Seaport + ConduitController
- deploys SeaDrop + ReefCreatorFactory
- creates a collection
- mints one NFT
- attempts a Seaport list-and-buy flow
- writes the deployment artifact to [reef-13939.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/deployments/reef-13939.json) when successful

### Legacy mint helper

```bash
npm run contracts:mint:reef
```

This older script is still present for the previous Reef-only collection path, but it is not the contract model the gated migration is targeting.

## Migration Rule

The Sqwid-style app migration does not proceed until the Phase 0 gate succeeds. That means:

- no live profile/create/search/mint/sell feature port has started yet
- the current frontend remains the existing shell
- the next unblocker is a reachable Reef RPC that accepts contract creation and returns bytecode

## Key Files

- [ReefSeaDropCollection.sol](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/src/ReefSeaDropCollection.sol)
- [ReefCreatorFactory.sol](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/src/ReefCreatorFactory.sol)
- [probe_reef_rpc.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/probe_reef_rpc.mjs)
- [deploy_standard_seaport.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_standard_seaport.mjs)
- [deploy_opensea_stack.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_opensea_stack.mjs)
- [reef-probe-13939.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/deployments/reef-probe-13939.json)
- [base-config.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/config/base-config.json)
- [App.tsx](/Users/anukul/Desktop/reef-opensea-fork-monorepo/apps/web/src/App.tsx)
- [index.ts](/Users/anukul/Desktop/reef-opensea-fork-monorepo/apps/api/src/index.ts)
- [smoke-routes.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/scripts/smoke-routes.mjs)
