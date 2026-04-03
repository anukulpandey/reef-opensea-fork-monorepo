import express from "express";
import path from "node:path";
import { z } from "zod";

import { config, ensureLocalDirectories, nodeConfig, publicConfig } from "./config.js";
import {
  getActivityData,
  getBootstrapData,
  getCollectionData,
  getCollectionsData,
  getDiscoverData,
  getDropsData,
  getItemData,
  getProfileData,
  getRewardsData,
  getStudioData,
  getTokensData
} from "./dataset.js";
import {
  initializeDatabase,
  isDatabaseReady,
  listOrders,
  listSales,
  saveOrder
} from "./db.js";
import { startIndexer } from "./indexer.js";
import { pinJsonToIpfs } from "./ipfs.js";
import { runtimeState } from "./runtime.js";
import { initializeStorage } from "./storage.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(config.publicStorageBasePath, express.static(config.storagePublicRoot));

app.use((_, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (_.method === "OPTIONS") {
    response.status(204).end();
    return;
  }
  next();
});

const orderSchema = z.object({
  orderHash: z.string().min(1),
  collectionAddress: z.string().min(1),
  tokenId: z.string().min(1),
  maker: z.string().min(1),
  priceRaw: z.string().min(1),
  currencyAddress: z.string().min(1),
  signature: z.string().min(1),
  order: z.unknown()
});

app.get("/health", async (_, response) => {
  response.json({
    ok: true,
    database: isDatabaseReady(),
    ipfs: runtimeState.ipfsReady,
    storage: runtimeState.storageReady,
    chainId: nodeConfig.network.chainId,
    mode: isDatabaseReady() ? "full" : "demo",
    databaseReason: runtimeState.databaseReason,
    ipfsReason: runtimeState.ipfsReason,
    storageReason: runtimeState.storageReason,
    liveTrading: nodeConfig.features.enableLiveTrading
  });
});

app.get("/config", (_, response) => {
  response.json({
    config: publicConfig,
    runtime: runtimePayload()
  });
});

app.get("/bootstrap", (_, response) => {
  response.json({
    ...getBootstrapData(),
    runtime: runtimePayload()
  });
});

app.get("/dataset/discover", (_, response) => {
  response.json(getDiscoverData());
});

app.get("/dataset/collections", (request, response) => {
  response.json(
    getCollectionsData({
      search: String(request.query.search ?? ""),
      sort: String(request.query.sort ?? ""),
      category: String(request.query.category ?? "")
    })
  );
});

app.get("/dataset/collection/:slug", (request, response) => {
  const result = getCollectionData(request.params.slug);
  if (!result) {
    response.status(404).json({ error: "Collection not found" });
    return;
  }
  response.json(result);
});

app.get("/dataset/item/:contract/:tokenId", (request, response) => {
  const result = getItemData(request.params.contract, request.params.tokenId);
  if (!result) {
    response.status(404).json({ error: "Item not found" });
    return;
  }
  response.json(result);
});

app.get("/dataset/tokens", (request, response) => {
  response.json(
    getTokensData({
      search: String(request.query.search ?? ""),
      sort: String(request.query.sort ?? "")
    })
  );
});

app.get("/dataset/activity", (request, response) => {
  response.json(
    getActivityData({
      type: String(request.query.type ?? "all"),
      search: String(request.query.search ?? "")
    })
  );
});

app.get("/dataset/drops", (request, response) => {
  response.json(
    getDropsData({
      stage: String(request.query.stage ?? "all")
    })
  );
});

app.get("/dataset/rewards", (_, response) => {
  response.json(getRewardsData());
});

app.get("/dataset/studio", (_, response) => {
  response.json(getStudioData());
});

app.get("/dataset/profile/:slug", (request, response) => {
  const result = getProfileData(request.params.slug);
  if (!result) {
    response.status(404).json({ error: "Profile not found" });
    return;
  }
  response.json(result);
});

app.post("/ipfs/json", async (request, response) => {
  const payload = (request.body as { payload?: unknown; filename?: string }) ?? {};
  const result = await pinJsonToIpfs(payload.payload ?? payload, payload.filename);
  response.json(result);
});

app.get("/orders", async (request, response) => {
  const collectionAddress = String(request.query.collectionAddress ?? "");
  const status = String(request.query.status ?? "active");
  const orders = await listOrders({ collectionAddress, status });
  response.json(orders);
});

app.post("/orders", async (request, response) => {
  const payload = orderSchema.parse(request.body);

  await saveOrder(payload);

  response.status(201).json({ ok: true, orderHash: payload.orderHash });
});

app.get("/sales", async (_, response) => {
  response.json(await listSales());
});

async function main() {
  ensureLocalDirectories();
  initializeStorage();
  await initializeDatabase();
  await startIndexer();

  app.listen(config.port, () => {
    console.log(`Reef marketplace API listening on ${config.port}`);
  });
}

function runtimePayload() {
  return {
    mode: isDatabaseReady() ? "full" : "demo",
    database: isDatabaseReady(),
    ipfs: runtimeState.ipfsReady,
    storage: runtimeState.storageReady,
    liveTrading: nodeConfig.features.enableLiveTrading,
    databaseReason: runtimeState.databaseReason,
    ipfsReason: runtimeState.ipfsReason,
    storageReason: runtimeState.storageReason
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
