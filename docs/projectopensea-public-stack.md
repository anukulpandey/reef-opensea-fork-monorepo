# ProjectOpenSea Public Stack Notes

This workspace vendors the following public ProjectOpenSea repositories under `external/projectopensea/`:

- `seaport`
- `seaport-js`
- `opensea-js`
- `stream-js`
- `buy-sell-opensea-sdk-demo`
- `seadrop`

## Why These Repos

These are the public pieces that are actually useful for building a Reef-native marketplace that feels OpenSea-like:

- `seaport`
  - the trading protocol itself
- `seaport-js`
  - the main self-hostable browser SDK for listings and fulfils
- `opensea-js`
  - useful reference for official OpenSea API integrations, but not sufficient by itself for a self-hosted marketplace
- `stream-js`
  - useful reference for websocket activity streaming
- `buy-sell-opensea-sdk-demo`
  - simple official example flow for buy/sell interactions
- `seadrop`
  - useful if Reef adds creator drop flows later

## What Is Still Not Public

The exact OpenSea production marketplace is still not fully open source. The public repos do not include the entire OpenSea web app, search stack, ranking stack, moderation systems, or private orderbook backend.

That means the right self-hosted architecture is:

1. Use Seaport and Seaport.js as the public core.
2. Build your own orderbook/indexer/API around them.
3. Build your own frontend around those same primitives.

That is the architecture this Reef monorepo now follows.
