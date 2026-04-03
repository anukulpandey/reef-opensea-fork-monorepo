import { Pool } from "pg";

import { config, nodeConfig } from "./config.js";
import {
  listRuntimeOrders,
  listRuntimeSales,
  markDatabaseReady,
  markDatabaseUnavailable,
  runtimeState,
  RuntimeOrderRecord,
  upsertRuntimeOrder
} from "./runtime.js";

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        order_hash TEXT NOT NULL UNIQUE,
        chain_id BIGINT NOT NULL,
        marketplace_address TEXT NOT NULL,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        maker TEXT NOT NULL,
        price_raw TEXT NOT NULL,
        currency_address TEXT NOT NULL,
        order_json JSONB NOT NULL,
        signature TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        id BIGSERIAL PRIMARY KEY,
        tx_hash TEXT NOT NULL UNIQUE,
        order_hash TEXT NOT NULL,
        collection_address TEXT NOT NULL,
        token_id TEXT NOT NULL,
        seller TEXT NOT NULL,
        buyer TEXT NOT NULL,
        currency_address TEXT NOT NULL,
        price_raw TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        state_key TEXT PRIMARY KEY,
        state_value TEXT NOT NULL
      );
    `);

    await pool.query(
      `
        INSERT INTO sync_state (state_key, state_value)
        VALUES ('deployment_chain_id', $1)
        ON CONFLICT (state_key) DO NOTHING
      `,
      [String(nodeConfig.network.chainId)]
    );

    markDatabaseReady();
  } catch (error) {
    markDatabaseUnavailable(error);
    console.warn("Database unavailable, API is running in in-memory demo mode.");
  }
}

export function isDatabaseReady() {
  return runtimeState.databaseReady;
}

export async function listOrders(filters?: {
  collectionAddress?: string;
  status?: string;
}) {
  if (!isDatabaseReady()) {
    return listRuntimeOrders(filters);
  }

  const collectionAddress = filters?.collectionAddress?.toLowerCase() ?? "";
  const status = filters?.status ?? "active";
  const values: string[] = [];
  let whereClause = "WHERE status = $1";
  values.push(status);

  if (collectionAddress) {
    values.push(collectionAddress);
    whereClause += ` AND collection_address = $${values.length}`;
  }

  const result = await pool.query(
    `
      SELECT
        order_hash AS "orderHash",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        maker,
        price_raw AS "priceRaw",
        currency_address AS "currencyAddress",
        signature,
        order_json AS order,
        status,
        created_at AS "createdAt"
      FROM orders
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values
  );

  return result.rows as RuntimeOrderRecord[];
}

export async function saveOrder(input: {
  orderHash: string;
  collectionAddress: string;
  tokenId: string;
  maker: string;
  priceRaw: string;
  currencyAddress: string;
  signature: string;
  order: unknown;
}) {
  if (!isDatabaseReady()) {
    upsertRuntimeOrder({
      ...input,
      collectionAddress: input.collectionAddress.toLowerCase(),
      maker: input.maker.toLowerCase(),
      currencyAddress: input.currencyAddress.toLowerCase(),
      status: "active",
      createdAt: new Date().toISOString()
    });
    return;
  }

  await pool.query(
    `
      INSERT INTO orders (
        order_hash,
        chain_id,
        marketplace_address,
        collection_address,
        token_id,
        maker,
        price_raw,
        currency_address,
        order_json,
        signature
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (order_hash)
      DO UPDATE SET
        collection_address = EXCLUDED.collection_address,
        token_id = EXCLUDED.token_id,
        maker = EXCLUDED.maker,
        price_raw = EXCLUDED.price_raw,
        currency_address = EXCLUDED.currency_address,
        order_json = EXCLUDED.order_json,
        signature = EXCLUDED.signature,
        status = 'active',
        updated_at = NOW()
    `,
    [
      input.orderHash,
      nodeConfig.network.chainId,
      nodeConfig.contracts.seaport.address,
      input.collectionAddress.toLowerCase(),
      input.tokenId,
      input.maker.toLowerCase(),
      input.priceRaw,
      input.currencyAddress.toLowerCase(),
      JSON.stringify(input.order),
      input.signature
    ]
  );
}

export async function listSales(limit = 50) {
  if (!isDatabaseReady()) {
    return listRuntimeSales(limit);
  }

  const result = await pool.query(
    `
      SELECT
        tx_hash AS "txHash",
        order_hash AS "orderHash",
        collection_address AS "collectionAddress",
        token_id AS "tokenId",
        seller,
        buyer,
        currency_address AS "currencyAddress",
        price_raw AS "priceRaw",
        block_number AS "blockNumber",
        created_at AS "createdAt"
      FROM sales
      ORDER BY block_number DESC, log_index DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}
