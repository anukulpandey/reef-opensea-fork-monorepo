# Feature Regression Log

This file tracks behaviors that should stay fixed unless there is an intentional product change.

## 2026-04-07

### NFT media persistence
- Minted NFT artwork must resolve at the NFT level, not silently fall back to the collection avatar when the item has its own media.
- Creator mint registration persists incoming `data:image/...` artwork into stable local storage under `/storage/nfts/...`.
- If the creator mint form leaves NFT artwork blank, the minted NFT must inherit the collection artwork instead of persisting the default `Reef NFT / Collector Edition` starter orb as fake item media.
- The API must normalize legacy starter-orb payloads from older browser bundles to the collection artwork before saving the NFT row.
- Profile cards, item detail, collection item grids, and related item shelves must prefer:
  1. stored NFT image
  2. metadata-derived NFT image
  3. deterministic per-item generated fallback
- Collection avatar fallback should only be used for collection presentation or for creator mints that never supplied explicit NFT artwork.
- Generated NFT fallback assets under `/storage/generated/...` must be publicly served by the API; returning those URLs without serving the files is a regression.

### Collection publish upload resilience
- `/ipfs/file` and `/ipfs/json` must not hard-fail collection creation just because the local IPFS API is temporarily unavailable.
- When IPFS pinning fails, the API must fall back to durable local storage under `/storage/ipfs/...` and still return a usable `ipfs://local/...` URI plus a working gateway URL.
- Metadata readers must understand those local fallback `ipfs://local/...` URIs so collection and NFT media keep rendering after publish.

### Collection-to-mint handoff
- A successfully published collection should hand off directly into `/create` with that collection preselected for minting.
- `/create` must support a mint queue so multiple NFTs can be uploaded and minted into the same selected collection without redoing collection selection for each item.
- Multi-file image imports should create queued NFT drafts instead of being discarded or forcing one-by-one manual entry.
- `/create` must expose an explicit collection selector plus a clear `Create new collection` action so the mint flow never feels locked to one hidden collection.
- NFT names must come from creator input, not hidden fallbacks like `NFT 1` or imported filename stems.
- Batch-uploaded queue items should stay unnamed until the creator fills in a name explicitly.

### Collection image uploader behavior
- The collection image upload surface on `/create/collection` must open the native file picker exactly once per user click.
- Do not combine native label-to-input activation with an extra imperative `.click()` on the same interaction surface.
- Drag-and-drop behavior must remain intact after uploader click fixes.

### Local stack URL mapping
- Frontend served on `3002` must target API `4010`.
- Frontend served on `3001` must target API `4002`.
- Do not hardcode `localhost:4000` for the local fallback UI entrypoints.

### Activity feed source
- `/activity` must use the aggregated live activity feed built from creator collections and live marketplace data.
- Active listings, mints, transfers, and sales must all appear if present in the live tables.

### Collection hero artwork
- The collection detail hero on `/collection/:slug` must use the collection avatar/PFP as the visual source, not silently switch to the first NFT item image.
- The hero should preserve the avatar as the branded anchor and layer gradient/glow treatment on top instead of showing placeholder collection-copy banners.

### Transaction submit dedupe
- Create collection, list item, cancel listing, and buy flows must only open one wallet transaction request per user action.
- UI loading state alone is not enough; keep a client-side action lock so rapid clicks cannot enqueue duplicate zero-value transactions.

### Collection publish receipt handling
- `/create/collection` must not stay stuck in a permanent publishing state just because `tx.wait()` does not resolve through the wallet provider.
- After submit, the app must poll Reef for the tx receipt directly and either continue on success or show a clear timeout error that tells the user to check wallet activity and refresh.

### Reef fallback collection deployment path
- On the local Reef runtime, fallback collection creation must not go through `ethers.ContractFactory.deploy(...)` from the browser or `ReefCollectionFactory721.createCollection(...)` / `ReefEditionFactory.createCollection(...)` on-chain.
- Those nested or raw wallet deployment paths regress on Reef and cause failed `Create Collection` transactions even when the underlying contracts are valid.
- Fallback collection publishing must use the authenticated backend relayer with the connected wallet recorded as the collection owner, and the resulting collection must still be persisted as a normal ready creator collection in the backend.
- A failed retry using the same collection slug must never downgrade or erase an already `ready` creator collection record in the database.
