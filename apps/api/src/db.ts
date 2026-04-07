import { Pool } from "pg";

import { config, nodeConfig } from "./config.js";
import {
  markDatabaseReady,
  markDatabaseUnavailable,
  runtimeState
} from "./runtime.js";

export type NftRecord = {
  collectionSlug: string;
  collectionAddress: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  ownerAddress: string;
  creatorAddress: string;
  attributes: Array<{ trait_type?: string; value?: string }>;
  mintedAt: string;
  updatedAt: string;
};

export type ListingRecord = {
  listingId: string;
  marketplaceAddress: string;
  collectionAddress: string;
  tokenId: string;
  seller: string;
  buyer: string | null;
  priceRaw: string;
  currencySymbol: string;
  status: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type SaleRecord = {
  txHash: string;
  listingId: string | null;
  collectionAddress: string;
  tokenId: string;
  seller: string;
  buyer: string;
  currencySymbol: string;
  priceRaw: string;
  blockNumber: number;
  createdAt: string;
};

export type TransferRecord = {
  txHash: string;
  logIndex: number;
  collectionAddress: string;
  tokenId: string;
  fromAddress: string;
  toAddress: string;
  eventType: string;
  blockNumber: number;
  createdAt: string;
};

export type AdminDropRecord = {
  slug: string;
  name: string;
  creatorName: string;
  creatorSlug: string;
  coverUrl: string;
  stage: string;
  mintPrice: string;
  supply: number;
  startLabel: string;
  description: string;
  createdBy: string;
  updatedBy: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatorCollectionRecord = {
  slug: string;
  ownerAddress: string;
  name: string;
  symbol: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  chainKey: string;
  chainName: string;
  standard: string;
  deploymentMode: string;
  factoryAddress: string;
  marketplaceMode: string;
  contractUri: string;
  contractAddress: string;
  deploymentTxHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  address: string;
  displayName: string;
  bio: string;
  avatarUri: string;
  bannerUri: string;
  links: Record<string, string>;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfts (
        collection_slug TEXT NOT NULL,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
        metadata_uri TEXT NOT NULL DEFAULT '',
        owner_address TEXT NOT NULL DEFAULT '',
        creator_address TEXT NOT NULL DEFAULT '',
        attributes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (collection_address, token_id)
      );

      CREATE TABLE IF NOT EXISTS listings (
        listing_id BIGINT PRIMARY KEY,
        marketplace_address TEXT NOT NULL,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        seller TEXT NOT NULL,
        buyer TEXT,
        price_raw TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        status TEXT NOT NULL,
        tx_hash TEXT NOT NULL UNIQUE,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        tx_hash TEXT PRIMARY KEY,
        listing_id BIGINT,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        seller TEXT NOT NULL,
        buyer TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        price_raw TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transfers (
        tx_hash TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        event_type TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tx_hash, log_index)
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        state_key TEXT PRIMARY KEY,
        state_value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        address TEXT PRIMARY KEY,
        display_name TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        avatar_uri TEXT NOT NULL DEFAULT '',
        banner_uri TEXT NOT NULL DEFAULT '',
        links_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS auth_nonces (
        address TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_drops (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator_name TEXT NOT NULL,
        creator_slug TEXT NOT NULL,
        cover_url TEXT NOT NULL,
        stage TEXT NOT NULL,
        mint_price TEXT NOT NULL,
        supply INTEGER NOT NULL,
        start_label TEXT NOT NULL,
        description TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS creator_collections (
        slug TEXT PRIMARY KEY,
        owner_address TEXT NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        banner_url TEXT NOT NULL DEFAULT '',
        chain_key TEXT NOT NULL DEFAULT 'reef',
        chain_name TEXT NOT NULL DEFAULT 'Reef Chain',
        standard TEXT NOT NULL DEFAULT 'ERC721',
        deployment_mode TEXT NOT NULL DEFAULT 'seadrop',
        factory_address TEXT NOT NULL DEFAULT '',
        marketplace_mode TEXT NOT NULL DEFAULT '',
        contract_uri TEXT NOT NULL DEFAULT '',
        contract_address TEXT NOT NULL DEFAULT '',
        deployment_tx_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS listings_collection_status_idx
        ON listings (collection_address, status, token_id);
      CREATE INDEX IF NOT EXISTS sales_collection_block_idx
        ON sales (collection_address, block_number DESC);
      CREATE INDEX IF NOT EXISTS transfers_collection_block_idx
        ON transfers (collection_address, block_number DESC);
      CREATE INDEX IF NOT EXISTS users_role_idx
        ON users (role, updated_at DESC);
      CREATE INDEX IF NOT EXISTS admin_drops_stage_archived_idx
        ON admin_drops (stage, archived, updated_at DESC);
      CREATE INDEX IF NOT EXISTS creator_collections_owner_idx
        ON creator_collections (owner_address, updated_at DESC);

      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS chain_key TEXT NOT NULL DEFAULT 'reef';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS chain_name TEXT NOT NULL DEFAULT 'Reef Chain';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS standard TEXT NOT NULL DEFAULT 'ERC721';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS deployment_mode TEXT NOT NULL DEFAULT 'seadrop';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS factory_address TEXT NOT NULL DEFAULT '';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS marketplace_mode TEXT NOT NULL DEFAULT '';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS contract_address TEXT NOT NULL DEFAULT '';
      ALTER TABLE creator_collections
        ADD COLUMN IF NOT EXISTS deployment_tx_hash TEXT NOT NULL DEFAULT '';
    `);

    await setSyncState("deployment_chain_id", String(nodeConfig.network.chainId));

    for (const adminWallet of config.adminWallets) {
      await upsertUserProfile({
        address: adminWallet,
        role: "admin"
      });
    }

    markDatabaseReady();
  } catch (error) {
    markDatabaseUnavailable(error);
    throw error;
  }
}

export function isDatabaseReady() {
  return runtimeState.databaseReady;
}

export async function getSyncState(stateKey: string) {
  const result = await pool.query(
    "SELECT state_value FROM sync_state WHERE state_key = $1",
    [stateKey]
  );
  return result.rowCount === 0 ? null : String(result.rows[0].state_value);
}

export async function setSyncState(stateKey: string, stateValue: string) {
  await pool.query(
    `
      INSERT INTO sync_state (state_key, state_value)
      VALUES ($1, $2)
      ON CONFLICT (state_key)
      DO UPDATE SET state_value = EXCLUDED.state_value
    `,
    [stateKey, stateValue]
  );
}

export async function upsertNft(input: {
  collectionSlug: string;
  collectionAddress: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  ownerAddress: string;
  creatorAddress: string;
  attributes: Array<{ trait_type?: string; value?: string }>;
  mintedAt?: string;
}) {
  await pool.query(
    `
      INSERT INTO nfts (
        collection_slug,
        collection_address,
        token_id,
        name,
        description,
        image_url,
        metadata_uri,
        owner_address,
        creator_address,
        attributes_json,
        minted_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (collection_address, token_id)
      DO UPDATE SET
        collection_slug = EXCLUDED.collection_slug,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        metadata_uri = EXCLUDED.metadata_uri,
        owner_address = EXCLUDED.owner_address,
        creator_address = COALESCE(NULLIF(nfts.creator_address, ''), EXCLUDED.creator_address),
        attributes_json = EXCLUDED.attributes_json,
        updated_at = NOW()
    `,
    [
      input.collectionSlug,
      input.collectionAddress.toLowerCase(),
      input.tokenId,
      input.name,
      input.description,
      input.imageUrl,
      input.metadataUri,
      input.ownerAddress.toLowerCase(),
      input.creatorAddress.toLowerCase(),
      JSON.stringify(input.attributes),
      input.mintedAt ?? new Date().toISOString()
    ]
  );
}

export async function updateNftOwner(input: {
  collectionAddress: string;
  tokenId: string;
  ownerAddress: string;
}) {
  await pool.query(
    `
      UPDATE nfts
      SET owner_address = $3, updated_at = NOW()
      WHERE collection_address = $1 AND token_id = $2
    `,
    [input.collectionAddress.toLowerCase(), input.tokenId, input.ownerAddress.toLowerCase()]
  );
}

export async function getNft(collectionAddress: string, tokenId: string) {
  const result = await pool.query(
    `
      SELECT
        collection_slug AS "collectionSlug",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        name,
        description,
        image_url AS "imageUrl",
        metadata_uri AS "metadataUri",
        owner_address AS "ownerAddress",
        creator_address AS "creatorAddress",
        attributes_json AS attributes,
        minted_at AS "mintedAt",
        updated_at AS "updatedAt"
      FROM nfts
      WHERE collection_address = $1 AND token_id = $2
      LIMIT 1
    `,
    [collectionAddress.toLowerCase(), tokenId]
  );

  return (result.rows[0] as NftRecord | undefined) ?? null;
}

export async function listNfts(collectionAddress: string) {
  const result = await pool.query(
    `
      SELECT
        collection_slug AS "collectionSlug",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        name,
        description,
        image_url AS "imageUrl",
        metadata_uri AS "metadataUri",
        owner_address AS "ownerAddress",
        creator_address AS "creatorAddress",
        attributes_json AS attributes,
        minted_at AS "mintedAt",
        updated_at AS "updatedAt"
      FROM nfts
      WHERE collection_address = $1
      ORDER BY CAST(token_id AS NUMERIC) ASC
    `,
    [collectionAddress.toLowerCase()]
  );

  return result.rows as NftRecord[];
}

export async function listNftsForAddress(address: string) {
  const normalizedAddress = address.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        collection_slug AS "collectionSlug",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        name,
        description,
        image_url AS "imageUrl",
        metadata_uri AS "metadataUri",
        owner_address AS "ownerAddress",
        creator_address AS "creatorAddress",
        attributes_json AS attributes,
        minted_at AS "mintedAt",
        updated_at AS "updatedAt"
      FROM nfts
      WHERE owner_address = $1 OR creator_address = $1
      ORDER BY minted_at DESC, updated_at DESC
    `,
    [normalizedAddress]
  );

  return result.rows as NftRecord[];
}

export async function listOwnedNftsForAddress(address: string) {
  const normalizedAddress = address.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        collection_slug AS "collectionSlug",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        name,
        description,
        image_url AS "imageUrl",
        metadata_uri AS "metadataUri",
        owner_address AS "ownerAddress",
        creator_address AS "creatorAddress",
        attributes_json AS attributes,
        minted_at AS "mintedAt",
        updated_at AS "updatedAt"
      FROM nfts
      WHERE owner_address = $1
      ORDER BY minted_at DESC, updated_at DESC
    `,
    [normalizedAddress]
  );

  return result.rows as NftRecord[];
}

export async function listCreatedNftsForAddress(address: string) {
  const normalizedAddress = address.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        collection_slug AS "collectionSlug",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        name,
        description,
        image_url AS "imageUrl",
        metadata_uri AS "metadataUri",
        owner_address AS "ownerAddress",
        creator_address AS "creatorAddress",
        attributes_json AS attributes,
        minted_at AS "mintedAt",
        updated_at AS "updatedAt"
      FROM nfts
      WHERE creator_address = $1
      ORDER BY minted_at DESC, updated_at DESC
    `,
    [normalizedAddress]
  );

  return result.rows as NftRecord[];
}

export async function upsertListingCreated(input: {
  listingId: string;
  marketplaceAddress: string;
  collectionAddress: string;
  tokenId: string;
  seller: string;
  priceRaw: string;
  txHash: string;
  blockNumber: number;
}) {
  await pool.query(
    `
      INSERT INTO listings (
        listing_id,
        marketplace_address,
        collection_address,
        token_id,
        seller,
        price_raw,
        currency_symbol,
        status,
        tx_hash,
        block_number
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9)
      ON CONFLICT (listing_id)
      DO UPDATE SET
        marketplace_address = EXCLUDED.marketplace_address,
        collection_address = EXCLUDED.collection_address,
        token_id = EXCLUDED.token_id,
        seller = EXCLUDED.seller,
        price_raw = EXCLUDED.price_raw,
        currency_symbol = EXCLUDED.currency_symbol,
        status = 'active',
        tx_hash = EXCLUDED.tx_hash,
        block_number = EXCLUDED.block_number,
        updated_at = NOW()
    `,
    [
      input.listingId,
      input.marketplaceAddress.toLowerCase(),
      input.collectionAddress.toLowerCase(),
      input.tokenId,
      input.seller.toLowerCase(),
      input.priceRaw,
      nodeConfig.network.nativeCurrency.symbol,
      input.txHash.toLowerCase(),
      input.blockNumber
    ]
  );
}

export async function markListingCancelled(listingId: string) {
  await pool.query(
    `
      UPDATE listings
      SET status = 'cancelled', updated_at = NOW()
      WHERE listing_id = $1
    `,
    [listingId]
  );
}

export async function markListingSold(input: { listingId: string; buyer: string }) {
  await pool.query(
    `
      UPDATE listings
      SET status = 'sold', buyer = $2, updated_at = NOW()
      WHERE listing_id = $1
    `,
    [input.listingId, input.buyer.toLowerCase()]
  );
}

export async function listListings(filters?: {
  collectionAddress?: string;
  status?: string;
  tokenId?: string;
  seller?: string;
  buyer?: string;
}) {
  const values: string[] = [];
  const clauses: string[] = [];

  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }

  if (filters?.collectionAddress) {
    values.push(filters.collectionAddress.toLowerCase());
    clauses.push(`collection_address = $${values.length}`);
  }

  if (filters?.tokenId) {
    values.push(filters.tokenId);
    clauses.push(`token_id = $${values.length}`);
  }

  if (filters?.seller) {
    values.push(filters.seller.toLowerCase());
    clauses.push(`seller = $${values.length}`);
  }

  if (filters?.buyer) {
    values.push(filters.buyer.toLowerCase());
    clauses.push(`buyer = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `
      SELECT
        listing_id::text AS "listingId",
        marketplace_address AS "marketplaceAddress",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        seller,
        buyer,
        price_raw AS "priceRaw",
        currency_symbol AS "currencySymbol",
        status,
        tx_hash AS "txHash",
        block_number AS "blockNumber",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM listings
      ${where}
      ORDER BY block_number DESC, listing_id DESC
    `,
    values
  );

  return result.rows as ListingRecord[];
}

export async function getListingByToken(collectionAddress: string, tokenId: string) {
  const result = await listListings({
    collectionAddress,
    tokenId,
    status: "active"
  });
  return result[0] ?? null;
}

export async function listSales(limit = 50, collectionAddress?: string, address?: string) {
  const values: Array<number | string> = [limit];
  const clauses: string[] = [];

  if (collectionAddress) {
    values.push(collectionAddress.toLowerCase());
    clauses.push(`collection_address = $${values.length}`);
  }

  if (address) {
    values.push(address.toLowerCase());
    clauses.push(`(seller = $${values.length} OR buyer = $${values.length})`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await pool.query(
    `
      SELECT
        tx_hash AS "txHash",
        listing_id::text AS "listingId",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        seller,
        buyer,
        currency_symbol AS "currencySymbol",
        price_raw AS "priceRaw",
        block_number AS "blockNumber",
        created_at AS "createdAt"
      FROM sales
      ${whereClause}
      ORDER BY block_number DESC, log_index DESC
      LIMIT $1
    `,
    values
  );

  return result.rows as SaleRecord[];
}

export async function insertSale(input: {
  txHash: string;
  listingId: string;
  collectionAddress: string;
  tokenId: string;
  seller: string;
  buyer: string;
  priceRaw: string;
  blockNumber: number;
  logIndex: number;
}) {
  await pool.query(
    `
      INSERT INTO sales (
        tx_hash,
        listing_id,
        collection_address,
        token_id,
        seller,
        buyer,
        currency_symbol,
        price_raw,
        block_number,
        log_index
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (tx_hash) DO NOTHING
    `,
    [
      input.txHash.toLowerCase(),
      input.listingId,
      input.collectionAddress.toLowerCase(),
      input.tokenId,
      input.seller.toLowerCase(),
      input.buyer.toLowerCase(),
      nodeConfig.network.nativeCurrency.symbol,
      input.priceRaw,
      input.blockNumber,
      input.logIndex
    ]
  );
}

export async function insertTransfer(input: {
  txHash: string;
  logIndex: number;
  collectionAddress: string;
  tokenId: string;
  fromAddress: string;
  toAddress: string;
  eventType: string;
  blockNumber: number;
}) {
  await pool.query(
    `
      INSERT INTO transfers (
        tx_hash,
        log_index,
        collection_address,
        token_id,
        from_address,
        to_address,
        event_type,
        block_number
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
    [
      input.txHash.toLowerCase(),
      input.logIndex,
      input.collectionAddress.toLowerCase(),
      input.tokenId,
      input.fromAddress.toLowerCase(),
      input.toAddress.toLowerCase(),
      input.eventType,
      input.blockNumber
    ]
  );
}

export async function listTransfers(limit = 100, filters?: {
  collectionAddress?: string;
  tokenId?: string;
  address?: string;
}) {
  const values: Array<number | string> = [limit];
  const clauses: string[] = [];

  if (filters?.collectionAddress) {
    values.push(filters.collectionAddress.toLowerCase());
    clauses.push(`collection_address = $${values.length}`);
  }

  if (filters?.tokenId) {
    values.push(filters.tokenId);
    clauses.push(`token_id = $${values.length}`);
  }

  if (filters?.address) {
    values.push(filters.address.toLowerCase());
    clauses.push(`(from_address = $${values.length} OR to_address = $${values.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `
      SELECT
        tx_hash AS "txHash",
        log_index AS "logIndex",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        from_address AS "fromAddress",
        to_address AS "toAddress",
        event_type AS "eventType",
        block_number AS "blockNumber",
        created_at AS "createdAt"
      FROM transfers
      ${where}
      ORDER BY block_number DESC, log_index DESC
      LIMIT $1
    `,
    values
  );

  return result.rows as TransferRecord[];
}

export async function listHolders(collectionAddress: string) {
  const result = await pool.query(
    `
      SELECT
        owner_address AS "ownerAddress",
        COUNT(*)::int AS quantity
      FROM nfts
      WHERE collection_address = $1
      GROUP BY owner_address
      ORDER BY quantity DESC, owner_address ASC
    `,
    [collectionAddress.toLowerCase()]
  );

  return result.rows as Array<{ ownerAddress: string; quantity: number }>;
}

export async function getUserByAddress(address: string) {
  const normalizedAddress = address.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        address,
        display_name AS "displayName",
        bio,
        avatar_uri AS "avatarUri",
        banner_uri AS "bannerUri",
        links_json AS links,
        role,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE address = $1
      LIMIT 1
    `,
    [normalizedAddress]
  );

  return (result.rows[0] as UserRecord | undefined) ?? null;
}

export async function searchUsers(query: string, limit = 20) {
  const normalizedQuery = `%${query.trim().toLowerCase()}%`;
  const result = await pool.query(
    `
      SELECT
        address,
        display_name AS "displayName",
        bio,
        avatar_uri AS "avatarUri",
        banner_uri AS "bannerUri",
        links_json AS links,
        role,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE
        lower(address) LIKE $1
        OR lower(display_name) LIKE $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [normalizedQuery, limit]
  );

  return result.rows as UserRecord[];
}

export async function upsertUserProfile(input: {
  address: string;
  displayName?: string;
  bio?: string;
  avatarUri?: string;
  bannerUri?: string;
  links?: Record<string, string>;
  role?: string;
}) {
  await pool.query(
    `
      INSERT INTO users (
        address,
        display_name,
        bio,
        avatar_uri,
        banner_uri,
        links_json,
        role,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (address)
      DO UPDATE SET
        display_name = CASE WHEN EXCLUDED.display_name = '' THEN users.display_name ELSE EXCLUDED.display_name END,
        bio = CASE WHEN EXCLUDED.bio = '' THEN users.bio ELSE EXCLUDED.bio END,
        avatar_uri = CASE WHEN EXCLUDED.avatar_uri = '' THEN users.avatar_uri ELSE EXCLUDED.avatar_uri END,
        banner_uri = CASE WHEN EXCLUDED.banner_uri = '' THEN users.banner_uri ELSE EXCLUDED.banner_uri END,
        links_json = CASE WHEN EXCLUDED.links_json = '{}'::jsonb THEN users.links_json ELSE EXCLUDED.links_json END,
        role = CASE WHEN EXCLUDED.role = '' THEN users.role ELSE EXCLUDED.role END,
        updated_at = NOW()
    `,
    [
      input.address.toLowerCase(),
      input.displayName ?? "",
      input.bio ?? "",
      input.avatarUri ?? "",
      input.bannerUri ?? "",
      JSON.stringify(input.links ?? {}),
      input.role ?? ""
    ]
  );
}

export async function createAuthNonce(address: string, nonce: string, expiresAt: string) {
  await pool.query(
    `
      INSERT INTO auth_nonces (address, nonce, expires_at, consumed_at, updated_at)
      VALUES ($1,$2,$3,NULL,NOW())
      ON CONFLICT (address)
      DO UPDATE SET
        nonce = EXCLUDED.nonce,
        expires_at = EXCLUDED.expires_at,
        consumed_at = NULL,
        updated_at = NOW()
    `,
    [address.toLowerCase(), nonce, expiresAt]
  );
}

export async function consumeAuthNonce(address: string, nonce: string) {
  const normalizedAddress = address.toLowerCase();
  const result = await pool.query(
    `
      UPDATE auth_nonces
      SET consumed_at = NOW(), updated_at = NOW()
      WHERE
        address = $1
        AND nonce = $2
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING nonce
    `,
    [normalizedAddress, nonce]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function listAdminDrops(options?: {
  stage?: string;
  includeArchived?: boolean;
}) {
  const values: Array<string | boolean> = [];
  const clauses: string[] = [];

  if (!options?.includeArchived) {
    values.push(false);
    clauses.push(`archived = $${values.length}`);
  }

  if (options?.stage && options.stage !== "all") {
    values.push(options.stage.toLowerCase());
    clauses.push(`LOWER(stage) = $${values.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `
      SELECT
        slug,
        name,
        creator_name AS "creatorName",
        creator_slug AS "creatorSlug",
        cover_url AS "coverUrl",
        stage,
        mint_price AS "mintPrice",
        supply,
        start_label AS "startLabel",
        description,
        created_by AS "createdBy",
        updated_by AS "updatedBy",
        archived,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM admin_drops
      ${where}
      ORDER BY archived ASC, updated_at DESC, created_at DESC
    `,
    values
  );

  return result.rows as AdminDropRecord[];
}

export async function upsertAdminDrop(input: {
  slug: string;
  name: string;
  creatorName: string;
  creatorSlug: string;
  coverUrl: string;
  stage: string;
  mintPrice: string;
  supply: number;
  startLabel: string;
  description: string;
  actorAddress: string;
}) {
  await pool.query(
    `
      INSERT INTO admin_drops (
        slug,
        name,
        creator_name,
        creator_slug,
        cover_url,
        stage,
        mint_price,
        supply,
        start_label,
        description,
        created_by,
        updated_by,
        archived,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,FALSE,NOW(),NOW())
      ON CONFLICT (slug)
      DO UPDATE SET
        name = EXCLUDED.name,
        creator_name = EXCLUDED.creator_name,
        creator_slug = EXCLUDED.creator_slug,
        cover_url = EXCLUDED.cover_url,
        stage = EXCLUDED.stage,
        mint_price = EXCLUDED.mint_price,
        supply = EXCLUDED.supply,
        start_label = EXCLUDED.start_label,
        description = EXCLUDED.description,
        updated_by = EXCLUDED.updated_by,
        archived = FALSE,
        updated_at = NOW()
    `,
    [
      input.slug,
      input.name,
      input.creatorName,
      input.creatorSlug,
      input.coverUrl,
      input.stage.toLowerCase(),
      input.mintPrice,
      input.supply,
      input.startLabel,
      input.description,
      input.actorAddress.toLowerCase()
    ]
  );
}

export async function archiveAdminDrop(slug: string, actorAddress: string) {
  await pool.query(
    `
      UPDATE admin_drops
      SET archived = TRUE, updated_by = $2, updated_at = NOW()
      WHERE slug = $1
    `,
    [slug, actorAddress.toLowerCase()]
  );
}

export async function listCreatorCollections(ownerAddress?: string) {
  const values: string[] = [];
  const where = ownerAddress
    ? (() => {
        values.push(ownerAddress.toLowerCase());
        return `WHERE owner_address = $${values.length}`;
      })()
    : "";

  const result = await pool.query(
    `
      SELECT
        slug,
        owner_address AS "ownerAddress",
        name,
        symbol,
        description,
        avatar_url AS "avatarUrl",
        banner_url AS "bannerUrl",
        chain_key AS "chainKey",
        chain_name AS "chainName",
        standard,
        deployment_mode AS "deploymentMode",
        factory_address AS "factoryAddress",
        marketplace_mode AS "marketplaceMode",
        contract_uri AS "contractUri",
        contract_address AS "contractAddress",
        deployment_tx_hash AS "deploymentTxHash",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM creator_collections
      ${where}
      ORDER BY updated_at DESC, created_at DESC
    `,
    values
  );

  return result.rows as CreatorCollectionRecord[];
}

export async function getCreatorCollectionBySlug(slug: string) {
  const result = await pool.query(
    `
      SELECT
        slug,
        owner_address AS "ownerAddress",
        name,
        symbol,
        description,
        avatar_url AS "avatarUrl",
        banner_url AS "bannerUrl",
        chain_key AS "chainKey",
        chain_name AS "chainName",
        standard,
        deployment_mode AS "deploymentMode",
        factory_address AS "factoryAddress",
        marketplace_mode AS "marketplaceMode",
        contract_uri AS "contractUri",
        contract_address AS "contractAddress",
        deployment_tx_hash AS "deploymentTxHash",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM creator_collections
      WHERE slug = $1
      LIMIT 1
    `,
    [slug]
  );

  return (result.rows[0] as CreatorCollectionRecord | undefined) ?? null;
}

export async function getCreatorCollectionByAddress(contractAddress: string) {
  const normalizedAddress = contractAddress.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        slug,
        owner_address AS "ownerAddress",
        name,
        symbol,
        description,
        avatar_url AS "avatarUrl",
        banner_url AS "bannerUrl",
        chain_key AS "chainKey",
        chain_name AS "chainName",
        standard,
        deployment_mode AS "deploymentMode",
        factory_address AS "factoryAddress",
        marketplace_mode AS "marketplaceMode",
        contract_uri AS "contractUri",
        contract_address AS "contractAddress",
        deployment_tx_hash AS "deploymentTxHash",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM creator_collections
      WHERE lower(contract_address) = $1
      LIMIT 1
    `,
    [normalizedAddress]
  );

  return (result.rows[0] as CreatorCollectionRecord | undefined) ?? null;
}

export async function upsertCreatorCollection(input: {
  slug: string;
  ownerAddress: string;
  name: string;
  symbol: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  chainKey: string;
  chainName: string;
  standard: string;
  deploymentMode: string;
  factoryAddress?: string;
  marketplaceMode?: string;
  contractUri: string;
  contractAddress: string;
  deploymentTxHash: string;
  status: string;
}) {
  await pool.query(
    `
      INSERT INTO creator_collections (
        slug,
        owner_address,
        name,
        symbol,
        description,
        avatar_url,
        banner_url,
        chain_key,
        chain_name,
        standard,
        deployment_mode,
        factory_address,
        marketplace_mode,
        contract_uri,
        contract_address,
        deployment_tx_hash,
        status,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())
      ON CONFLICT (slug)
      DO UPDATE SET
        owner_address = EXCLUDED.owner_address,
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        description = EXCLUDED.description,
        avatar_url = EXCLUDED.avatar_url,
        banner_url = EXCLUDED.banner_url,
        chain_key = EXCLUDED.chain_key,
        chain_name = EXCLUDED.chain_name,
        standard = EXCLUDED.standard,
        deployment_mode = EXCLUDED.deployment_mode,
        factory_address = EXCLUDED.factory_address,
        marketplace_mode = EXCLUDED.marketplace_mode,
        contract_uri = EXCLUDED.contract_uri,
        contract_address = EXCLUDED.contract_address,
        deployment_tx_hash = EXCLUDED.deployment_tx_hash,
        status = EXCLUDED.status,
        updated_at = NOW()
      WHERE creator_collections.status <> 'ready' OR EXCLUDED.status = 'ready'
    `,
    [
      input.slug,
      input.ownerAddress.toLowerCase(),
      input.name,
      input.symbol,
      input.description,
      input.avatarUrl,
      input.bannerUrl,
      input.chainKey,
      input.chainName,
      input.standard,
      input.deploymentMode,
      input.factoryAddress ?? "",
      input.marketplaceMode ?? "",
      input.contractUri,
      input.contractAddress,
      input.deploymentTxHash,
      input.status
    ]
  );
}
