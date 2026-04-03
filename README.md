# Reef OpenSea Clone Monorepo

This repo is a Reef-targeted, OpenSea-dark marketplace monorepo. It mirrors the public OpenSea route tree and browse patterns, uses official public ProjectOpenSea primitives like Seaport and SeaDrop, runs supporting services with Docker Compose, and serves deterministic dummy marketplace data until Reef contract verification is reliable.

This is not the literal private OpenSea production stack. OpenSea does not publish the full marketplace frontend, backend, search, ranking, moderation, or indexing systems. What is public is enough to build a near-identical public marketplace experience around the same core primitives, and that is what this repo does.

## What Is In The Repo

- `apps/web`
  - React + Vite public marketplace clone styled to match the logged-out OpenSea dark desktop experience
  - routed pages for discover, collections, tokens, swap, drops, activity, rewards, studio, profile, collection detail, item detail, and creator pages
- `apps/api`
  - Express route-data API
  - deterministic dataset generator
  - orderbook endpoints
  - IPFS JSON pinning with local fallback storage
  - Postgres-backed sales indexing when infra is available
- `packages/config`
  - single shared source of truth for site metadata, Reef network info, service URLs, storage paths, feature flags, dummy-data seed, and contract addresses
- `packages/contracts`
  - Reef collection contract
  - Seaport deployment scripts
  - SeaDrop reference consumption
  - normalized deployment artifacts
- `external/projectopensea`
  - vendored public ProjectOpenSea repos used as official references
- `storage`
  - bind-mounted local storage for generated assets, IPFS fallback payloads, Postgres data, and IPFS node data

## Public Route Map

Top-level routes:

- `/`
- `/collections`
- `/tokens`
- `/swap`
- `/drops`
- `/activity`
- `/rewards`
- `/studio`
- `/profile`

Detail routes:

- `/collection/:slug`
- `/collection/:slug/explore`
- `/collection/:slug/items`
- `/collection/:slug/offers`
- `/collection/:slug/holders`
- `/collection/:slug/activity`
- `/collection/:slug/analytics`
- `/item/reef/:contract/:tokenId`
- `/:creator/created`

The route inventory and route-data mapping live in [docs/route-map.md](/Users/anukul/Desktop/reef-opensea-fork-monorepo/docs/route-map.md).

## Shared Config

`packages/config` is the contract between the web app, API, Docker stack, and deployment scripts.

It owns:

- `site`
  - OpenSea-style chrome text, nav items, hero controls, footer bar, and collection tab patterns
- `network`
  - Reef chain metadata and RPC URL
- `contracts`
  - Seaport, ConduitController, SeaDrop, and collection addresses plus deployment artifact paths
- `services`
  - API, web, and IPFS URLs
- `storage`
  - local storage roots and public paths
- `dummyData`
  - deterministic dataset seed and collection counts
- `features`
  - live-trading and shell feature flags

The API loads the full node config and exposes a sanitized public subset through:

- `GET /config`
- `GET /bootstrap`

## Data Model And Runtime Behavior

The browsing experience is intentionally deterministic.

- collection, item, token, activity, drop, rewards, and studio data are generated from `DUMMY_DATA_SEED`
- generated images are written into `storage/public/generated`
- IPFS JSON fallback files are written into `storage/public/ipfs`
- the frontend reads route data from the API instead of hardcoding page content
- search, filter, sort, and tab state are URL-backed on the routed pages

What is real:

- Reef network metadata
- shared contract configuration
- static storage serving
- orderbook endpoints
- sales indexing and Postgres persistence when infra is available
- IPFS pinning when the local IPFS node is available

What is dummy:

- collection browse data
- item browse data
- token market data
- drops, rewards, and studio route content
- public stats, charts, holders, and offer shells

## Compose-First Infra

The main stack is defined in [docker-compose.yml](/Users/anukul/Desktop/reef-opensea-fork-monorepo/docker-compose.yml):

- `postgres`
- `ipfs`
- `api`
- `web`

Bind-mounted local storage:

- `./storage/postgres`
- `./storage/ipfs`
- `./storage/public/generated`
- `./storage/public/ipfs`

Start everything:

```bash
cp .env.example .env
docker compose up --build -d
```

Useful commands:

```bash
npm run stack:up
npm run stack:down
npm run docker:logs
```

Expected ports:

- web: `http://localhost:3000`
- api: `http://localhost:4000`
- IPFS gateway: `http://localhost:8080/ipfs`
- IPFS API: `http://localhost:5001`
- Postgres: `localhost:5432`

Note:

- Docker could not be executed in this workspace because Docker is not installed on this machine.
- The compose files and Dockerfiles are present and wired, but they were not started here.

## Local Non-Docker Development

Install dependencies:

```bash
npm install
```

Build everything:

```bash
npm run build
```

Run the API:

```bash
npm run start --workspace @reef/api
```

Run the web preview:

```bash
npm run preview --workspace @reef/web -- --host 0.0.0.0 --port 3000
```

If Postgres and IPFS are not running, the API falls back to demo mode and the UI still renders the full public marketplace shell with generated data.

## Route Data And API Endpoints

Core endpoints:

- `GET /health`
- `GET /config`
- `GET /bootstrap`
- `GET /dataset/discover`
- `GET /dataset/collections`
- `GET /dataset/collection/:slug`
- `GET /dataset/item/:contract/:tokenId`
- `GET /dataset/tokens`
- `GET /dataset/activity`
- `GET /dataset/drops`
- `GET /dataset/rewards`
- `GET /dataset/studio`
- `GET /dataset/profile/:slug`

Marketplace endpoints:

- `POST /ipfs/json`
- `GET /orders`
- `POST /orders`
- `GET /sales`

## Contracts And Deployment

Official public OpenSea primitives used here:

- `seaport`
- `seaport-js`
- `opensea-js`
- `stream-js`
- `buy-sell-opensea-sdk-demo`
- `seadrop`

Deployment flow:

```bash
npm run contracts:build
npm run contracts:deploy:reef
```

What the deployment scripts do:

1. Read Reef network and contract defaults from `packages/config`.
2. Attempt the canonical Seaport bootstrap path first.
3. Fall back to standard CREATE deployments when Reef rejects the canonical path.
4. Verify deployed bytecode with `eth_getCode` before treating contract deployment as live.
5. Deploy the sample Reef collection and write normalized artifacts.

Relevant files:

- [packages/contracts/script/deploy_reef.sh](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_reef.sh)
- [packages/contracts/script/deploy_standard_seaport.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_standard_seaport.mjs)
- [packages/contracts/script/deploy_collection_direct.mjs](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/script/deploy_collection_direct.mjs)

## Current Reef Caveat

As of April 3, 2026, Reef contract deployment is still blocked by RPC verification behavior.

Observed issue:

- contract-creation transactions can return successful receipts
- the reported contract address can still return `0x` from `eth_getCode`

Because of that, the Reef marketplace fails closed:

- browse flows still render
- config and route data still work
- live trading buttons degrade to explicit demo or unavailable states
- the repo does not pretend the marketplace is fully live when the contracts are not verifiable

## Smoke Checks

After the API and web app are running locally, run:

```bash
npm run smoke:routes
```

That script validates:

- API route-data endpoints
- direct-load behavior for the public web routes
- a collection route
- an item route
- a creator route

## Vendored Public ProjectOpenSea Repos

The public OpenSea repos cloned into `external/projectopensea/` are documented in [docs/projectopensea-public-stack.md](/Users/anukul/Desktop/reef-opensea-fork-monorepo/docs/projectopensea-public-stack.md).

They are used as official references for the parts OpenSea actually publishes, while this repo provides the missing self-hosted frontend, API, and local infra needed for a deployable marketplace stack.
