# Public Route Map

This document describes the public route inventory that mirrors the OpenSea public information architecture in the repo's literal dark OpenSea-style shell.

## Top-Level Routes

- `/`
  - Discover landing page with hero, trending collections, drops, tokens, and recent activity.
- `/collections`
  - Searchable and sortable collections index.
- `/tokens`
  - Searchable and sortable token market table.
- `/swap`
  - Logged-in trading intent shell with Reef chain copy and Seaport wiring status.
- `/drops`
  - Drops landing page with stage filters and generated campaigns.
- `/activity`
  - Marketplace-wide activity feed with event-type filtering.
- `/rewards`
  - Logged-out shell modeled after OpenSea Rewards.
- `/studio`
  - Logged-out shell modeled after OpenSea Studio and backed by SeaDrop references.
- `/profile`
  - Logged-out collector profile shell.

## Collection Routes

- `/collection/:slug`
  - Collection overview hero, stats, featured items, related collections.
- `/collection/:slug/explore`
  - OpenSea-style collection browse grid.
- `/collection/:slug/items`
  - Item grid alias for collection browsing.
- `/collection/:slug/offers`
  - Offer table shell.
- `/collection/:slug/holders`
  - Holder leaderboard shell.
- `/collection/:slug/activity`
  - Collection-scoped activity feed.
- `/collection/:slug/analytics`
  - Analytics card and trend panel shell.

## Item And Creator Routes

- `/item/reef/:contract/:tokenId`
  - NFT item detail page with media, price card, traits, and history.
- `/:creator/created`
  - Creator landing page with created collections and items.

## Route Data Sources

- `/bootstrap`
  - Shared route metadata, nav, featured collections, drops, tokens, references, runtime flags.
- `/dataset/discover`
  - Discover page sections.
- `/dataset/collections`
  - Collection index data with search and filters.
- `/dataset/collection/:slug`
  - Collection detail, items, offers, holders, activity, analytics.
- `/dataset/item/:contract/:tokenId`
  - Item detail route data.
- `/dataset/tokens`
  - Token table data.
- `/dataset/activity`
  - Activity feed data.
- `/dataset/drops`
  - Drop index data.
- `/dataset/rewards`
  - Rewards shell data.
- `/dataset/studio`
  - Studio shell data.
- `/dataset/profile/:slug`
  - Creator/profile route data.

## Real vs Dummy

- Real
  - Reef network metadata from shared config.
  - Contract addresses and deployment artifacts when verified.
  - Orderbook, sales, and IPFS endpoints.
  - Generated assets served from local storage paths.
- Dummy
  - Public marketplace browse data, stats, holders, offers, rewards, and studio panels.
  - Generated collection, item, token, and activity records from the deterministic seed.
- Degraded When Reef Contracts Are Not Verifiable
  - Buy and list flows render explicit demo or unavailable states instead of pretending live trading works.
