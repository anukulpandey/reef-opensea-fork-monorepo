import express from "express";
import { JsonRpcProvider } from "ethers";
import { z } from "zod";

import {
  buildAuthMessage,
  createNonce,
  issueAccessToken,
  readAccessToken,
  verifyWalletSignature
} from "./auth.js";
import { config, ensureLocalDirectories, nodeConfig, publicConfig } from "./config.js";
import {
  getActivityData,
  getBootstrapData,
  getCollectionData,
  getCollectionsData,
  getDiscoverData,
  getDropData,
  getDropsData,
  getItemData,
  getProfileData,
  getRewardsData,
  getStudioData,
  getTokensData
} from "./dataset.js";
import {
  createAuthNonce,
  consumeAuthNonce,
  getCreatorCollectionBySlug,
  getUserByAddress,
  insertTransfer,
  initializeDatabase,
  listCreatorCollections,
  listListings,
  listSales,
  searchUsers,
  upsertListingCreated,
  upsertUserProfile,
  upsertNft,
  upsertCreatorCollection
} from "./db.js";
import { deployCreatorCollection } from "./deployer.js";
import { checkIpfsHealth, pinFileToIpfs, pinJsonToIpfs } from "./ipfs.js";
import { startIndexer } from "./indexer.js";
import { archiveAdminDrop, listAdminDrops, upsertAdminDrop } from "./managed-drops.js";
import { runtimeState, setCapability, setDeploymentMode } from "./runtime.js";
import { initializeStorage, writeDataUrlAsset } from "./storage.js";

const app = express();
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
app.use(express.json({ limit: process.env.API_JSON_LIMIT ?? "80mb" }));
app.use(`${config.publicStorageBasePath}/generated`, express.static(config.storageGeneratedRoot));
app.use(`${config.publicStorageBasePath}/ipfs`, express.static(config.storageIpfsFallbackRoot));
app.use(config.publicStorageBasePath, express.static(config.storagePublicRoot));

syncRuntimeCapabilitiesFromConfig();

const contractCodeCache = new Map<string, { code: string; expiresAt: number }>();
const contractCodePending = new Map<string, Promise<string>>();
const contractCodeCacheTtlMs = 20_000;
const missingContractCodeCacheTtlMs = 4_000;

function normalizeRpcUrl(rpcUrl: string) {
  return rpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? rpcUrl.replace("host.docker.internal", "127.0.0.1")
    : rpcUrl;
}

async function readContractCode(address: string) {
  const normalizedAddress = address.trim().toLowerCase();
  if (!normalizedAddress) {
    return "0x";
  }

  const cached = contractCodeCache.get(normalizedAddress);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.code;
  }

  const inflight = contractCodePending.get(normalizedAddress);
  if (inflight) {
    return inflight;
  }

  const pending = new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl))
    .getCode(normalizedAddress)
    .catch(() => "0x");
  contractCodePending.set(
    normalizedAddress,
    pending.then((code) => {
      contractCodeCache.set(normalizedAddress, {
        code,
        expiresAt: Date.now() + (code === "0x" ? missingContractCodeCacheTtlMs : contractCodeCacheTtlMs)
      });
      contractCodePending.delete(normalizedAddress);
      return code;
    })
  );
  return contractCodePending.get(normalizedAddress)!;
}

async function withCreatorCollectionState<T extends {
  status: string;
  contractAddress: string;
}>(collection: T) {
  if (!collection.contractAddress.trim()) {
    return {
      ...collection,
      contractReady: false,
      contractReason: "Collection contract has not been deployed yet."
    };
  }

  const code = await readContractCode(collection.contractAddress);
  if (code === "0x") {
    return {
      ...collection,
      contractReady: false,
      contractReason:
        "Saved collection contract is unavailable on Reef. Redeploy the collection before minting NFTs."
    };
  }

  return {
    ...collection,
    contractReady: true,
    contractReason: ""
  };
}

app.get("/health", async (_, response) => {
  response.json({
    ok: runtimeState.databaseReady && runtimeState.storageReady,
    services: {
      database: runtimeState.databaseReady,
      ipfs: runtimeState.ipfsReady,
      storage: runtimeState.storageReady
    },
    contracts: runtimeState.contracts,
    deploymentMode: runtimeState.deploymentMode,
    capabilities: runtimeState.capabilities,
    liveTrading:
      nodeConfig.features.enableLiveTrading &&
      (runtimeState.capabilities.marketplace.erc721.enabled ||
        runtimeState.capabilities.marketplace.erc1155.enabled),
    chainId: nodeConfig.network.chainId,
    indexer: runtimeState.indexer,
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

app.get("/auth/nonce", async (request, response) => {
  try {
    const { address } = authNonceQuerySchema.parse(request.query);
    const nonce = createNonce();
    const message = buildAuthMessage(address, nonce, nodeConfig.network.chainName);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await createAuthNonce(address, nonce, expiresAt);
    response.json({
      address: address.toLowerCase(),
      nonce,
      message,
      expiresAt
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid auth nonce request"
    });
  }
});

app.post("/auth/verify", async (request, response) => {
  try {
    const payload = authVerifySchema.parse(request.body ?? {});
    const normalizedAddress = payload.address.toLowerCase();
    const expectedMessage = buildAuthMessage(normalizedAddress, payload.nonce, nodeConfig.network.chainName);
    if (payload.message !== expectedMessage) {
      response.status(400).json({ error: "Signed message does not match the expected Reef auth message." });
      return;
    }
    if (!verifyWalletSignature({
      address: normalizedAddress,
      message: payload.message,
      signature: payload.signature
    })) {
      response.status(401).json({ error: "Wallet signature could not be verified." });
      return;
    }
    const consumed = await consumeAuthNonce(normalizedAddress, payload.nonce);
    if (!consumed) {
      response.status(401).json({ error: "Nonce is invalid, expired, or already used." });
      return;
    }

    const existingUser = await getUserByAddress(normalizedAddress);
    const role =
      existingUser?.role ??
      (config.adminWallets.includes(normalizedAddress) ? "admin" : "creator");

    await upsertUserProfile({
      address: normalizedAddress,
      role
    });

    const token = issueAccessToken(
      {
        sub: normalizedAddress,
        role
      },
      config.authTokenSecret
    );

    response.json({
      token,
      user: await getUserByAddress(normalizedAddress)
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Auth verification failed"
    });
  }
});

app.get("/auth/session", async (request, response) => {
  const auth = getAuthenticatedUser(request);
  if (!auth) {
    response.status(401).json({ error: "Missing or invalid session." });
    return;
  }
  response.json({
    user: await getUserByAddress(auth.address)
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

const authNonceQuerySchema = z.object({
  address: z.string().trim().min(42).max(80)
});

const authVerifySchema = z.object({
  address: z.string().trim().min(42).max(80),
  nonce: z.string().trim().min(8).max(128),
  message: z.string().trim().min(10).max(4000),
  signature: z.string().trim().min(10).max(1024)
});

const userProfileSchema = z.object({
  displayName: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
  avatarUri: z.string().trim().max(2048).default(""),
  bannerUri: z.string().trim().max(2048).default(""),
  links: z.record(z.string(), z.string()).default({})
});

const creatorCollectionSchema = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().min(1).max(20),
  description: z.string().trim().max(2000).default(""),
  avatarUrl: z.string().trim().min(1),
  bannerUrl: z.string().trim().min(1),
  chainKey: z.string().trim().min(1).max(24).default("reef"),
  chainName: z.string().trim().min(1).max(80).default(nodeConfig.network.chainName),
  standard: z.enum(["ERC721", "ERC1155"]).default("ERC721"),
  deploymentMode: z.string().trim().min(1).max(40).default("fallback"),
  factoryAddress: z.string().trim().max(80).default(""),
  marketplaceMode: z.string().trim().max(40).default("blocked"),
  contractUri: z.string().trim().default(""),
  contractAddress: z.string().trim().default(""),
  deploymentTxHash: z.string().trim().default(""),
  status: z.enum(["draft", "gated", "deploying", "ready"]).default("draft")
});

const creatorCollectionDeploySchema = creatorCollectionSchema.extend({
  royaltyBps: z.coerce.number().int().min(0).max(10_000).default(0)
});

const creatorMintSchema = z.object({
  collectionSlug: z.string().trim().min(1).max(80),
  collectionAddress: z.string().trim().min(1).max(80),
  tokenId: z.string().trim().min(1).max(80),
  metadataUri: z.string().trim().min(1),
  imageUrl: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).default(""),
  ownerAddress: z.string().trim().min(1).max(80),
  creatorAddress: z.string().trim().min(1).max(80),
  txHash: z.string().trim().min(1).max(120),
  blockNumber: z.coerce.number().int().nonnegative().default(0),
  attributes: z
    .array(
      z.object({
        trait_type: z.string().trim().optional(),
        value: z.string().trim().optional()
      })
    )
    .default([])
});

const ipfsFileSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  dataUrl: z.string().trim().min(10),
  contentType: z.string().trim().max(120).optional()
});

const marketplaceOrderSchema = z.object({
  listingId: z.string().trim().min(1).max(80),
  marketplaceAddress: z.string().trim().min(1).max(80),
  collectionAddress: z.string().trim().min(1).max(80),
  tokenId: z.string().trim().min(1).max(80),
  seller: z.string().trim().min(1).max(80),
  priceRaw: z.string().trim().min(1).max(120),
  txHash: z.string().trim().min(1).max(120),
  blockNumber: z.coerce.number().int().nonnegative().default(0)
});

app.get("/admin/session", (request, response) => {
  const auth = getAuthenticatedUser(request);
  response.json({
    wallet: auth?.address ?? "",
    isAdmin: auth?.role === "admin"
  });
});

app.get("/admin/drops", async (request, response) => {
  const auth = requireAdminUser(request, response);
  if (!auth) {
    return;
  }

  response.json({
    wallet: auth.address,
    drops: await listAdminDrops({ includeArchived: true, includeInternal: true })
  });
});

app.get("/users/:address", async (request, response) => {
  const address = String(request.params.address ?? "").trim().toLowerCase();
  if (!address) {
    response.status(400).json({ error: "Address is required." });
    return;
  }

  const user =
    (await getUserByAddress(address)) ??
    ({
      address,
      displayName: "",
      bio: "",
      avatarUri: "",
      bannerUri: "",
      links: {},
      role: config.adminWallets.includes(address) ? "admin" : "creator"
    });

  response.json({ user });
});

app.patch("/users/me", async (request, response) => {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return;
  }

  try {
    const payload = userProfileSchema.parse(request.body ?? {});
    await upsertUserProfile({
      address: auth.address,
      displayName: payload.displayName,
      bio: payload.bio,
      avatarUri: payload.avatarUri,
      bannerUri: payload.bannerUri,
      links: payload.links,
      role: auth.role
    });
    response.json({
      ok: true,
      user: await getUserByAddress(auth.address)
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid profile update"
    });
  }
});

app.get("/creator/collections", async (request, response) => {
  const owner = String(request.query.owner ?? "").trim().toLowerCase();
  response.json({
    owner,
    collections: await Promise.all(
      (await listCreatorCollections(owner || undefined)).map((collection) =>
        withCreatorCollectionState(collection)
      )
    )
  });
});

app.get("/collections", async (request, response) => {
  const owner = String(request.query.owner ?? "").trim().toLowerCase();
  response.json({
    collections: await Promise.all(
      (await listCreatorCollections(owner || undefined)).map((collection) =>
        withCreatorCollectionState(collection)
      )
    )
  });
});

app.get("/creator/collections/:slug", async (request, response) => {
  const collection = await getCreatorCollectionBySlug(slugify(request.params.slug));
  if (!collection) {
    response.status(404).json({ error: "Creator collection not found" });
    return;
  }
  response.json(await withCreatorCollectionState(collection));
});

app.get("/collections/:slug", async (request, response) => {
  const collection = await getCreatorCollectionBySlug(slugify(request.params.slug));
  if (!collection) {
    response.status(404).json({ error: "Creator collection not found" });
    return;
  }
  response.json(await withCreatorCollectionState(collection));
});

app.get("/collections/owner/:address", async (request, response) => {
  const owner = String(request.params.address ?? "").trim().toLowerCase();
  response.json({
    owner,
    collections: await Promise.all(
      (await listCreatorCollections(owner || undefined)).map((collection) =>
        withCreatorCollectionState(collection)
      )
    )
  });
});

app.post("/creator/collections/deploy", async (request, response) => {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return;
  }

  try {
    const payload = creatorCollectionDeploySchema.parse(request.body ?? {});
    const creatorCapability =
      payload.standard === "ERC1155"
        ? runtimeState.capabilities.creator.erc1155
        : runtimeState.capabilities.creator.erc721;
    if (!creatorCapability.enabled || creatorCapability.mode === "blocked") {
      response.status(503).json({
        error:
          creatorCapability.reason ||
          `Creator deployments for ${payload.standard} are not available on this Reef runtime.`
      });
      return;
    }

    if (creatorCapability.mode === "official") {
      response.status(409).json({
        error: "Official creator deploys must be submitted through the wallet path."
      });
      return;
    }

    const slug = slugify(payload.slug || payload.name);
    const deployment = await deployCreatorCollection({
      standard: payload.standard,
      name: payload.name,
      symbol: payload.symbol,
      contractUri: payload.contractUri,
      ownerAddress: auth.address,
      royaltyBps: payload.royaltyBps,
      factoryAddress: creatorCapability.factoryAddress
    });

    await upsertCreatorCollection({
      slug,
      ownerAddress: auth.address,
      name: payload.name,
      symbol: payload.symbol,
      description: payload.description,
      avatarUrl: payload.avatarUrl,
      bannerUrl: payload.bannerUrl,
      chainKey: payload.chainKey,
      chainName: payload.chainName,
      standard: payload.standard,
      deploymentMode: creatorCapability.mode,
      factoryAddress: deployment.factoryAddress,
      marketplaceMode: payload.marketplaceMode || creatorCapability.marketplaceMode || "blocked",
      contractUri: payload.contractUri,
      contractAddress: deployment.address,
      deploymentTxHash: deployment.txHash,
      status: "ready"
    });

    response.status(201).json({
      ok: true,
      slug,
      contractAddress: deployment.address,
      deploymentTxHash: deployment.txHash,
      blockNumber: deployment.blockNumber,
      deploymentMode: creatorCapability.mode,
      factoryAddress: deployment.factoryAddress,
      marketplaceMode: payload.marketplaceMode || creatorCapability.marketplaceMode || "blocked"
    });
  } catch (error) {
    response.status(503).json({
      error: error instanceof Error ? error.message : "Failed to deploy creator collection"
    });
  }
});

app.post("/creator/collections", async (request, response) => {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return;
  }

  try {
    const payload = creatorCollectionSchema.parse(request.body ?? {});
    const slug = slugify(payload.slug || payload.name);
    await upsertCreatorCollection({
      slug,
      ownerAddress: auth.address,
      name: payload.name,
      symbol: payload.symbol,
      description: payload.description,
      avatarUrl: payload.avatarUrl,
      bannerUrl: payload.bannerUrl,
      chainKey: payload.chainKey,
      chainName: payload.chainName,
      standard: payload.standard,
      deploymentMode: payload.deploymentMode,
      factoryAddress: payload.factoryAddress,
      marketplaceMode: payload.marketplaceMode,
      contractUri: payload.contractUri,
      contractAddress: payload.contractAddress,
      deploymentTxHash: payload.deploymentTxHash,
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

app.post("/creator/mints", handleCreatorMint);
app.post("/assets/mint", handleCreatorMint);

app.post("/admin/drops", async (request, response) => {
  const auth = requireAdminUser(request, response);
  if (!auth) {
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
      actorAddress: auth.address
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
  const auth = requireAdminUser(request, response);
  if (!auth) {
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
      actorAddress: auth.address
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
  const auth = requireAdminUser(request, response);
  if (!auth) {
    return;
  }

  await archiveAdminDrop(slugify(request.params.slug), auth.address);
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

app.get("/assets/:contract/:tokenId", async (request, response) => {
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

app.get("/dataset/drop/:slug", async (request, response) => {
  const result = await getDropData(request.params.slug);
  if (!result) {
    response.status(404).json({ error: "Drop not found" });
    return;
  }
  response.json(result);
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

app.post("/ipfs/file", async (request, response) => {
  try {
    const payload = ipfsFileSchema.parse(request.body ?? {});
    const match = payload.dataUrl.match(/^data:([^;,]+)?((?:;[^,]+)*),([\s\S]+)$/);
    if (!match) {
      response.status(400).json({ error: "Invalid data URL payload." });
      return;
    }

    const mimeType = payload.contentType?.trim() || match[1] || "application/octet-stream";
    const parameters = match[2] ?? "";
    const isBase64 = parameters.toLowerCase().includes(";base64");
    const rawBody = match[3] ?? "";
    const contents = isBase64
      ? Buffer.from(rawBody, "base64")
      : Buffer.from(decodeURIComponent(rawBody), "utf8");

    const result = await pinFileToIpfs({
      filename: payload.filename,
      contents,
      contentType: mimeType
    });
    response.json(result);
  } catch (error) {
    response.status(503).json({
      error: error instanceof Error ? error.message : "Failed to pin file to IPFS"
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

app.post("/marketplace/orders", async (request, response) => {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return;
  }

  try {
    const payload = marketplaceOrderSchema.parse(request.body ?? {});
    if (payload.seller.toLowerCase() !== auth.address) {
      response.status(403).json({ error: "Authenticated wallet must match the listing seller." });
      return;
    }
    await upsertListingCreated({
      listingId: payload.listingId,
      marketplaceAddress: payload.marketplaceAddress,
      collectionAddress: payload.collectionAddress,
      tokenId: payload.tokenId,
      seller: payload.seller,
      priceRaw: payload.priceRaw,
      txHash: payload.txHash,
      blockNumber: payload.blockNumber
    });
    response.status(201).json({ ok: true, listingId: payload.listingId });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid marketplace order"
    });
  }
});

app.get("/marketplace/orders", async (request, response) => {
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

app.get("/marketplace/offers", async (_, response) => {
  response.json({ offers: [] });
});

app.get("/marketplace/activity", async (_, response) => {
  response.json(await getActivityData({ type: "all", search: "" }));
});

app.get("/marketplace/summary", async (_, response) => {
  const [listings, sales, activity] = await Promise.all([
    listListings({ status: "active" }),
    listSales(),
    getActivityData({ type: "all", search: "" })
  ]);
  response.json({
    totals: {
      listings: listings.length,
      sales: sales.length,
      activity: activity.activities.length
    }
  });
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

app.get("/search/collections/:query", async (request, response) => {
  const query = String(request.params.query ?? "").trim().toLowerCase();
  const collections = await listCreatorCollections();
  response.json({
    collections: await Promise.all(
      collections
        .filter((collection) =>
          !query
            ? true
            : collection.name.toLowerCase().includes(query) ||
              collection.slug.toLowerCase().includes(query) ||
              collection.symbol.toLowerCase().includes(query)
        )
        .map((collection) => withCreatorCollectionState(collection))
    )
  });
});

app.get("/search/users/:query", async (request, response) => {
  const query = String(request.params.query ?? "").trim();
  response.json({
    users: query ? await searchUsers(query) : []
  });
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

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "entity.too.large"
  ) {
    response.status(413).json({
      error: "Payload too large. Upload a smaller file or use the IPFS file upload path."
    });
    return;
  }

  response.status(500).json({
    error: error instanceof Error ? error.message : "Unexpected server error"
  });
});
}

async function handleCreatorMint(request: express.Request, response: express.Response) {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return;
  }

  try {
    const payload = creatorMintSchema.parse(request.body ?? {});
    const collection = await getCreatorCollectionBySlug(slugify(payload.collectionSlug));
    if (!collection) {
      response.status(404).json({ error: "Creator collection not found" });
      return;
    }
    if (collection.ownerAddress.toLowerCase() !== auth.address) {
      response.status(403).json({ error: "Only the collection owner can register creator mints." });
      return;
    }
    if (
      collection.contractAddress &&
      collection.contractAddress.toLowerCase() !== payload.collectionAddress.toLowerCase()
    ) {
      response.status(400).json({ error: "Mint collection address does not match the saved creator collection." });
      return;
    }

    const collectionState = await withCreatorCollectionState(collection);
    if (
      !collectionState.contractAddress.trim() ||
      collectionState.status.toLowerCase() !== "ready"
    ) {
      response.status(409).json({
        error: `Selected collection is ${collectionState.status}. Deploy the collection contract before minting.`
      });
      return;
    }
    if (!collectionState.contractReady) {
      response.status(409).json({
        error:
          collectionState.contractReason ||
          "Saved collection contract is unavailable on Reef. Redeploy the collection before minting NFTs."
      });
      return;
    }

    const normalizedImageUrl = normalizeCreatorMintImageUrl(collection, payload.imageUrl);
    const persistedImageUrl = persistCreatorMintImage(collection.slug, payload.tokenId, normalizedImageUrl);

    await upsertNft({
      collectionSlug: collection.slug,
      collectionAddress: payload.collectionAddress,
      tokenId: payload.tokenId,
      name: payload.name,
      description: payload.description,
      imageUrl: persistedImageUrl,
      metadataUri: payload.metadataUri,
      ownerAddress: payload.ownerAddress,
      creatorAddress: payload.creatorAddress,
      attributes: payload.attributes
    });

    await insertTransfer({
      txHash: payload.txHash,
      logIndex: 0,
      collectionAddress: payload.collectionAddress,
      tokenId: payload.tokenId,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: payload.ownerAddress,
      eventType: "mint",
      blockNumber: payload.blockNumber
    });

    response.status(201).json({
      ok: true,
      collectionSlug: collection.slug,
      tokenId: payload.tokenId
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid creator mint payload"
    });
  }
}

function persistCreatorMintImage(collectionSlug: string, tokenId: string, imageUrl: string) {
  const normalized = imageUrl.trim();
  if (!normalized) {
    return "";
  }
  if (!normalized.startsWith("data:image/")) {
    return normalized;
  }
  return writeDataUrlAsset("nfts", `${collectionSlug}-${tokenId}`, normalized) || normalized;
}

function decodeInlineSvgDataUrl(url: string) {
  if (!url.startsWith("data:image/svg+xml")) {
    return "";
  }
  const separatorIndex = url.indexOf(",");
  if (separatorIndex === -1) {
    return "";
  }
  try {
    return decodeURIComponent(url.slice(separatorIndex + 1));
  } catch {
    return "";
  }
}

function isImplicitDefaultStarterArtwork(url: string) {
  const svg = decodeInlineSvgDataUrl(url);
  if (!svg) {
    return false;
  }
  return (
    svg.includes('width="1200"') &&
    svg.includes('height="1200"') &&
    svg.includes('viewBox="0 0 1200 1200"') &&
    svg.includes('fill="#0d1014"') &&
    svg.includes('x="96" y="1020"') &&
    svg.includes('x="96" y="1076"') &&
    (
      svg.includes('id="orbFill"') ||
      svg.includes('id="maskFill"') ||
      svg.includes('id="monolithFill"') ||
      svg.includes('id="glyphFill"')
    )
  );
}

function normalizeCreatorMintImageUrl(
  collection: { avatarUrl: string; bannerUrl: string },
  imageUrl: string
) {
  const normalized = imageUrl.trim();
  const collectionFallback = collection.avatarUrl.trim() || collection.bannerUrl.trim() || "";
  if (!normalized || isImplicitDefaultStarterArtwork(normalized)) {
    return collectionFallback;
  }
  return normalized;
}

function runtimePayload() {
  return {
    services: {
      database: runtimeState.databaseReady,
      ipfs: runtimeState.ipfsReady,
      storage: runtimeState.storageReady
    },
    contracts: runtimeState.contracts,
    deploymentMode: runtimeState.deploymentMode,
    capabilities: runtimeState.capabilities,
    liveTrading:
      nodeConfig.features.enableLiveTrading &&
      (runtimeState.capabilities.marketplace.erc721.enabled ||
        runtimeState.capabilities.marketplace.erc1155.enabled),
    indexer: runtimeState.indexer,
    reasons: {
      database: runtimeState.databaseReason,
      ipfs: runtimeState.ipfsReason,
      storage: runtimeState.storageReason,
      contracts: runtimeState.contractReasons
    }
  };
}

function syncRuntimeCapabilitiesFromConfig() {
  setDeploymentMode(nodeConfig.deployment.mode);
  setCapability("creator", "erc721", nodeConfig.deployment.creator.erc721);
  setCapability("creator", "erc1155", nodeConfig.deployment.creator.erc1155);
  setCapability("marketplace", "erc721", nodeConfig.deployment.marketplace.erc721);
  setCapability("marketplace", "erc1155", nodeConfig.deployment.marketplace.erc1155);
}

function getAuthenticatedUser(request: express.Request) {
  const authorization = request.header("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();
  if (!token) {
    return null;
  }

  try {
    const payload = readAccessToken(token, config.authTokenSecret);
    return {
      address: String(payload.sub).toLowerCase(),
      role: String(payload.role ?? "user")
    };
  } catch {
    return null;
  }
}

function requireAuthenticatedUser(request: express.Request, response: express.Response) {
  const auth = getAuthenticatedUser(request);
  if (!auth) {
    response.status(401).json({
      error: "A signed wallet session is required."
    });
    return null;
  }
  return auth;
}

function requireAdminUser(request: express.Request, response: express.Response) {
  const auth = requireAuthenticatedUser(request, response);
  if (!auth) {
    return null;
  }
  if (auth.role !== "admin") {
    response.status(403).json({
      error: "Admin access is restricted to Reef team wallets."
    });
    return null;
  }
  return auth;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
