import express from "express";
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
  archiveAdminDrop,
  getCreatorCollectionBySlug,
  initializeDatabase,
  listAdminDrops,
  listCreatorCollections,
  listListings,
  listSales,
  upsertCreatorCollection,
  upsertAdminDrop
} from "./db.js";
import { checkIpfsHealth, pinJsonToIpfs } from "./ipfs.js";
import { startIndexer } from "./indexer.js";
import { runtimeState } from "./runtime.js";
import { initializeStorage } from "./storage.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(config.publicStorageBasePath, express.static(config.storagePublicRoot));

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Wallet, X-Creator-Wallet, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }
  next();
});

app.get("/health", async (_, response) => {
  response.json({
    ok: runtimeState.databaseReady && runtimeState.storageReady,
    services: {
      database: runtimeState.databaseReady,
      ipfs: runtimeState.ipfsReady,
      storage: runtimeState.storageReady
    },
    contracts: runtimeState.contracts,
    liveTrading:
      nodeConfig.features.enableLiveTrading &&
      runtimeState.contracts.collection &&
      runtimeState.contracts.marketplace,
    chainId: nodeConfig.network.chainId,
    reasons: {
      database: runtimeState.databaseReason,
      ipfs: runtimeState.ipfsReason,
      storage: runtimeState.storageReason,
      contracts: runtimeState.contractReasons
    }
  });
});

app.get("/config", (_, response) => {
  response.json({
    config: publicConfig,
    runtime: runtimePayload()
  });
});

app.get("/bootstrap", async (_, response) => {
  response.json({
    ...(await getBootstrapData()),
    runtime: runtimePayload()
  });
});

const adminDropSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(120),
  creatorName: z.string().trim().min(1).max(120),
  creatorSlug: z.string().trim().min(1).max(120).optional(),
  coverUrl: z.string().trim().min(1),
  stage: z.enum(["draft", "live", "upcoming", "ended"]),
  mintPrice: z.string().trim().min(1).max(80),
  supply: z.coerce.number().int().nonnegative().max(1_000_000),
  startLabel: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000)
});

const creatorCollectionSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().min(1).max(20),
  description: z.string().trim().max(2000).default(""),
  avatarUrl: z.string().trim().min(1),
  bannerUrl: z.string().trim().min(1),
  contractUri: z.string().trim().default(""),
  status: z.enum(["draft", "ready"]).default("draft")
});

app.get("/admin/session", (request, response) => {
  const wallet = getAdminWallet(request);
  response.json({
    wallet,
    isAdmin: wallet ? config.adminWallets.includes(wallet) : false
  });
});

app.get("/admin/drops", async (request, response) => {
  const wallet = requireAdminWallet(request, response);
  if (!wallet) {
    return;
  }

  response.json({
    wallet,
    drops: await listAdminDrops({ includeArchived: true })
  });
});

app.get("/creator/collections", async (request, response) => {
  const owner = String(request.query.owner ?? "").trim().toLowerCase();
  response.json({
    owner,
    collections: await listCreatorCollections(owner || undefined)
  });
});

app.get("/creator/collections/:slug", async (request, response) => {
  const collection = await getCreatorCollectionBySlug(slugify(request.params.slug));
  if (!collection) {
    response.status(404).json({ error: "Creator collection not found" });
    return;
  }
  response.json(collection);
});

app.post("/creator/collections", async (request, response) => {
  const wallet = String(request.header("x-creator-wallet") ?? "").trim().toLowerCase();
  if (!wallet) {
    response.status(401).json({ error: "Creator wallet header is required" });
    return;
  }

  try {
    const payload = creatorCollectionSchema.parse(request.body ?? {});
    const slug = slugify(payload.slug || payload.name);
    await upsertCreatorCollection({
      slug,
      ownerAddress: wallet,
      name: payload.name,
      symbol: payload.symbol,
      description: payload.description,
      avatarUrl: payload.avatarUrl,
      bannerUrl: payload.bannerUrl,
      contractUri: payload.contractUri,
      status: payload.status
    });

    response.status(201).json({
      ok: true,
      slug
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid creator collection payload"
    });
  }
});

app.post("/admin/drops", async (request, response) => {
  const wallet = requireAdminWallet(request, response);
  if (!wallet) {
    return;
  }

  try {
    const payload = adminDropSchema.parse(request.body ?? {});
    const slug = slugify(payload.slug || payload.name);
    const creatorSlug = slugify(payload.creatorSlug || payload.creatorName);
    await upsertAdminDrop({
      slug,
      name: payload.name,
      creatorName: payload.creatorName,
      creatorSlug,
      coverUrl: payload.coverUrl,
      stage: payload.stage,
      mintPrice: payload.mintPrice,
      supply: payload.supply,
      startLabel: payload.startLabel,
      description: payload.description,
      actorAddress: wallet
    });

    response.status(201).json({
      ok: true,
      slug
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid admin drop payload"
    });
  }
});

app.patch("/admin/drops/:slug", async (request, response) => {
  const wallet = requireAdminWallet(request, response);
  if (!wallet) {
    return;
  }

  try {
    const payload = adminDropSchema.parse(request.body ?? {});
    const slug = slugify(request.params.slug);
    const creatorSlug = slugify(payload.creatorSlug || payload.creatorName);
    await upsertAdminDrop({
      slug,
      name: payload.name,
      creatorName: payload.creatorName,
      creatorSlug,
      coverUrl: payload.coverUrl,
      stage: payload.stage,
      mintPrice: payload.mintPrice,
      supply: payload.supply,
      startLabel: payload.startLabel,
      description: payload.description,
      actorAddress: wallet
    });

    response.json({
      ok: true,
      slug
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid admin drop payload"
    });
  }
});

app.delete("/admin/drops/:slug", async (request, response) => {
  const wallet = requireAdminWallet(request, response);
  if (!wallet) {
    return;
  }

  await archiveAdminDrop(slugify(request.params.slug), wallet);
  response.json({ ok: true });
});

app.get("/dataset/discover", async (_, response) => {
  response.json(await getDiscoverData());
});

app.get("/dataset/collections", async (request, response) => {
  response.json(
    await getCollectionsData({
      search: String(request.query.search ?? ""),
      sort: String(request.query.sort ?? ""),
      category: String(request.query.category ?? ""),
      view: String(request.query.view ?? ""),
      timeframe: String(request.query.timeframe ?? "")
    })
  );
});

app.get("/dataset/collection/:slug", async (request, response) => {
  const result = await getCollectionData(request.params.slug);
  if (!result) {
    response.status(404).json({ error: "Collection not found" });
    return;
  }
  response.json(result);
});

app.get("/dataset/item/:contract/:tokenId", async (request, response) => {
  const result = await getItemData(request.params.contract, request.params.tokenId);
  if (!result) {
    response.status(404).json({ error: "Item not found" });
    return;
  }
  response.json(result);
});

app.get("/dataset/tokens", async (request, response) => {
  response.json(
    await getTokensData({
      search: String(request.query.search ?? ""),
      sort: String(request.query.sort ?? "")
    })
  );
});

app.get("/dataset/activity", async (request, response) => {
  response.json(
    await getActivityData({
      type: String(request.query.type ?? "all"),
      search: String(request.query.search ?? "")
    })
  );
});

app.get("/dataset/drops", async (request, response) => {
  response.json(
    await getDropsData({
      stage: String(request.query.stage ?? "all")
    })
  );
});

app.get("/dataset/rewards", async (_, response) => {
  response.json(await getRewardsData());
});

app.get("/dataset/studio", async (_, response) => {
  response.json(await getStudioData());
});

app.get("/dataset/profile/:slug", async (request, response) => {
  const result = await getProfileData(request.params.slug);
  if (!result) {
    response.status(404).json({ error: "Profile not found" });
    return;
  }
  response.json(result);
});

app.post("/ipfs/json", async (request, response) => {
  try {
    const payload = (request.body as { payload?: unknown; filename?: string }) ?? {};
    const result = await pinJsonToIpfs(payload.payload ?? payload, payload.filename);
    response.json(result);
  } catch (error) {
    response.status(503).json({
      error: error instanceof Error ? error.message : "IPFS request failed"
    });
  }
});

app.get("/listings", async (request, response) => {
  const collectionAddress = String(request.query.collectionAddress ?? "");
  const status = String(request.query.status ?? "active");
  const tokenId = String(request.query.tokenId ?? "");
  response.json(
    await listListings({
      collectionAddress,
      status,
      tokenId
    })
  );
});

app.get("/orders", async (request, response) => {
  const collectionAddress = String(request.query.collectionAddress ?? "");
  const status = String(request.query.status ?? "active");
  const tokenId = String(request.query.tokenId ?? "");
  response.json(
    await listListings({
      collectionAddress,
      status,
      tokenId
    })
  );
});

app.get("/sales", async (_, response) => {
  response.json(await listSales());
});

async function main() {
  ensureLocalDirectories();
  initializeStorage();
  await initializeDatabase();
  await checkIpfsHealth();
  await startIndexer();

  app.listen(config.port, () => {
    console.log(`Reef marketplace API listening on ${config.port}`);
  });
}

function runtimePayload() {
  return {
    services: {
      database: runtimeState.databaseReady,
      ipfs: runtimeState.ipfsReady,
      storage: runtimeState.storageReady
    },
    contracts: runtimeState.contracts,
    liveTrading:
      nodeConfig.features.enableLiveTrading &&
      runtimeState.contracts.collection &&
      runtimeState.contracts.marketplace,
    reasons: {
      database: runtimeState.databaseReason,
      ipfs: runtimeState.ipfsReason,
      storage: runtimeState.storageReason,
      contracts: runtimeState.contractReasons
    }
  };
}

function getAdminWallet(request: express.Request) {
  const walletHeader = request.header("x-admin-wallet");
  return walletHeader ? walletHeader.trim().toLowerCase() : "";
}

function requireAdminWallet(request: express.Request, response: express.Response) {
  const wallet = getAdminWallet(request);
  if (!wallet || !config.adminWallets.includes(wallet)) {
    response.status(403).json({
      error: "Admin access is restricted to Reef team wallets."
    });
    return null;
  }
  return wallet;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
