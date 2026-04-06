# Route Map

This document describes the current route behavior of the OpenSea-style Reef shell.

## Core Live Routes

- `/`
  - OpenSea-dark discover shell
  - empty shelves until real Reef data exists
- `/collections`
  - live-backed collection index
  - zero rows until a real collection is verifiably live and indexed
- `/activity`
  - live-backed listings, sales, mints, and transfers
- `/collection/:slug`
  - collection detail for the deployed collection only
  - tabs for:
    - `explore`
    - `items`
    - `offers`
    - `holders`
    - `activity`
    - `analytics`
    - `traits`
    - `about`
- `/item/reef/:contract/:tokenId`
  - deep-link modal
  - only resolves for real indexed NFTs

## Non-Core Shell Routes

These routes remain in the UI shell but are honest unavailable or empty states:

- `/tokens`
- `/swap`
- `/drops`
- `/rewards`
- `/studio`
- `/profile`
- `/:creator/created`

## Data Sources

Primary API routes:

- `/health`
- `/config`
- `/bootstrap`
- `/dataset/discover`
- `/dataset/collections`
- `/dataset/collection/:slug`
- `/dataset/item/:contract/:tokenId`
- `/dataset/activity`
- `/dataset/profile/:slug`
- `/listings`
- `/orders`
- `/sales`

Shell-only API routes:

- `/dataset/tokens`
- `/dataset/drops`
- `/dataset/rewards`
- `/dataset/studio`

## Backing Tables

Core live data comes from:

- `nfts`
- `listings`
- `sales`
- `transfers`
- `sync_state`

## Live vs Unavailable

Live when the Reef deployment path succeeds:

- collection browse
- item browse
- listings
- sales
- transfers
- wallet listing actions
- wallet cancel actions
- wallet buy actions

Unavailable until the Reef RPC accepts contract deployment and returns bytecode:

- contract-backed trading
- collection route population from live deployed NFTs
- item routes for real on-chain NFTs

## Current Blocker

As of April 3, 2026, the collection and marketplace contracts are not live because the Reef RPC deployment probe is failing.

The recorded failure artifact is:

- [packages/contracts/deployments/reef-probe-13939.json](/Users/anukul/Desktop/reef-opensea-fork-monorepo/packages/contracts/deployments/reef-probe-13939.json)

The current app therefore behaves as:

- core public routes load
- local infra is live
- API health is real
- trading controls remain hidden until the Reef deployment blocker is resolved
