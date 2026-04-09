import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  parseEther
} from "ethers";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(rootDir, ".env") });

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4002";
const rpcUrl = (process.env.REEF_RPC_URL ?? "http://127.0.0.1:8545").replace(
  "host.docker.internal",
  "127.0.0.1"
);
const requestTimeoutMs = Number(process.env.E2E_REQUEST_TIMEOUT_MS ?? 15000);
const privateKey = process.env.PRIVATE_KEY;
const authSecret = process.env.AUTH_TOKEN_SECRET ?? privateKey;

if (!privateKey || !authSecret) {
  throw new Error("Missing PRIVATE_KEY or AUTH_TOKEN_SECRET in .env");
}

function base64url(input) {
  return Buffer.from(typeof input === "string" ? input : JSON.stringify(input))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function issueToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + 8 * 60 * 60 };
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(body);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function api(pathname, init = {}) {
  console.error(`[e2e] api ${pathname}`);
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...init,
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${pathname} -> ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(description, predicate, timeoutMs = 15000, intervalMs = 500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await predicate();
    if (result) {
      return result;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out while waiting for ${description}`);
}

function svgDataUri(label, accent) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" fill="none">
  <rect width="1200" height="1200" fill="#0d1014"/>
  <rect x="72" y="72" width="1056" height="1056" rx="84" fill="#101827"/>
  <circle cx="920" cy="260" r="188" fill="${accent}" fill-opacity="0.28"/>
  <circle cx="280" cy="900" r="220" fill="${accent}" fill-opacity="0.18"/>
  <text x="96" y="180" font-family="Arial" font-size="40" fill="rgba(255,255,255,0.72)">Reef Local E2E</text>
  <text x="96" y="980" font-family="Arial" font-size="92" font-weight="700" fill="#fff">${label}</text>
  <text x="96" y="1076" font-family="Arial" font-size="34" fill="rgba(255,255,255,0.68)">Fresh smart-contract verification asset</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const config = await api("/config");
console.error("[e2e] config loaded");
const provider = new JsonRpcProvider(rpcUrl, Number(config.config.network.chainId));
const wallet = new Wallet(privateKey, provider);
const token = issueToken(
  {
    sub: wallet.address.toLowerCase(),
    role: "admin"
  },
  authSecret
);

const suffix = Date.now().toString(36);
const collectionName = `Nova ${suffix}`;
const collectionSlug = `nova-${suffix}`;
const collectionSymbol = `N${suffix.slice(-5).toUpperCase()}`;
const collectionArt = svgDataUri(collectionName, "#4f8cff");

const contractMetadata = await api("/ipfs/json", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    filename: `${collectionSlug}-contract.json`,
    payload: {
      name: collectionName,
      description: "Contract metadata for local end-to-end verification.",
      image: collectionArt,
      external_link: "http://localhost:3001"
    }
  })
});
console.error("[e2e] contract metadata pinned");

const deployed = await api("/creator/collections/deploy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    slug: collectionSlug,
    name: collectionName,
    symbol: collectionSymbol,
    description: "Fresh ERC721 verification collection on the local Reef chain.",
    avatarUrl: collectionArt,
    bannerUrl: collectionArt,
    chainKey: config.config.network.key,
    chainName: config.config.network.chainName,
    standard: "ERC721",
    deploymentMode: config.config.deployment.creator.erc721.mode,
    factoryAddress: config.config.deployment.creator.erc721.factoryAddress,
    marketplaceMode: config.config.deployment.marketplace.erc721.mode,
    contractUri: contractMetadata.uri,
    royaltyBps: 500
  })
});
console.error(`[e2e] collection deployed ${deployed.contractAddress}`);

const collectionAddress = deployed.contractAddress;
const collectionAbi = [
  "function owner() view returns (address)",
  "function mintCreator(address to, string tokenUri) external returns (uint256)",
  "function approve(address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];
const collection = new Contract(collectionAddress, collectionAbi, wallet);
const collectionInterface = new Interface(collectionAbi);
const collectionOwner = await collection.owner();
console.error(`[e2e] collection owner ${collectionOwner}`);

if (collectionOwner.toLowerCase() !== wallet.address.toLowerCase()) {
  throw new Error(`Unexpected collection owner ${collectionOwner}`);
}

const nftName = `${collectionName} Prime`;
const tokenArt = svgDataUri(`Token ${suffix.slice(-4)}`, "#ff6b6b");
const tokenMetadata = await api("/ipfs/json", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    filename: `${collectionSlug}-token.json`,
    payload: {
      name: nftName,
      description: "Minted through the new ERC721 creator contract.",
      image: tokenArt,
      attributes: [
        { trait_type: "Stage", value: "Local" },
        { trait_type: "Flow", value: "E2E" }
      ]
    }
  })
});
console.error("[e2e] token metadata pinned");

console.error("[e2e] minting token");
const mintTx = await collection.mintCreator(wallet.address, tokenMetadata.uri);
const mintReceipt = await mintTx.wait();
console.error(`[e2e] mint confirmed ${mintTx.hash}`);
const transferLog = mintReceipt.logs.find((log) => {
  try {
    const parsed = collectionInterface.parseLog(log);
    return (
      parsed?.name === "Transfer" &&
      String(parsed.args.from) === "0x0000000000000000000000000000000000000000"
    );
  } catch {
    return false;
  }
});

if (!transferLog) {
  throw new Error("Mint succeeded but tokenId could not be parsed from the Transfer log");
}

const parsedTransfer = collectionInterface.parseLog(transferLog);
const tokenId = parsedTransfer.args.tokenId.toString();

await api("/creator/mints", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    collectionSlug: collectionSlug,
    collectionAddress,
    tokenId,
    metadataUri: tokenMetadata.uri,
    imageUrl: tokenArt,
    name: nftName,
    description: "Registered from the new creator mint flow.",
    ownerAddress: wallet.address,
    creatorAddress: wallet.address,
    txHash: mintTx.hash,
    blockNumber: mintReceipt.blockNumber,
    attributes: [
      { trait_type: "Stage", value: "Local" },
      { trait_type: "Flow", value: "E2E" }
    ]
  })
});
console.error("[e2e] creator mint registered in API");

const marketplaceAddress = config.config.deployment.marketplace.erc721.address;
const marketplaceAbi = [
  "function createListing(address collection, uint256 tokenId, uint256 price) external returns (uint256)",
  "function buyListing(uint256 listingId) external payable",
  "event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed collection, uint256 tokenId, uint256 price)",
  "event ListingPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, address collection, uint256 tokenId, uint256 price)"
];
const marketplace = new Contract(marketplaceAddress, marketplaceAbi, wallet);
const marketplaceInterface = new Interface(marketplaceAbi);

console.error("[e2e] approving marketplace");
const approveTx = await collection.approve(marketplaceAddress, tokenId);
await approveTx.wait();
console.error(`[e2e] approve confirmed ${approveTx.hash}`);

const price = parseEther("1");
console.error("[e2e] creating listing");
const createListingTx = await marketplace.createListing(collectionAddress, tokenId, price);
const createListingReceipt = await createListingTx.wait();
console.error(`[e2e] listing confirmed ${createListingTx.hash}`);
const listingLog = createListingReceipt.logs.find((log) => {
  try {
    return marketplaceInterface.parseLog(log)?.name === "ListingCreated";
  } catch {
    return false;
  }
});

if (!listingLog) {
  throw new Error("Listing succeeded but listingId could not be parsed from the event log");
}

const parsedListing = marketplaceInterface.parseLog(listingLog);
const listingId = parsedListing.args.listingId.toString();

await api("/marketplace/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    listingId,
    marketplaceAddress,
    collectionAddress,
    tokenId,
    seller: wallet.address,
    priceRaw: price.toString(),
    txHash: createListingTx.hash,
    blockNumber: createListingReceipt.blockNumber
  })
});
console.error("[e2e] listing mirrored into API");

console.error("[e2e] buying listing");
const buyListingTx = await marketplace.buyListing(listingId, { value: price });
const buyListingReceipt = await buyListingTx.wait();
console.error(`[e2e] buy confirmed ${buyListingTx.hash}`);

const dropSlug = `launch-${suffix}`;
await api("/admin/drops", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    slug: dropSlug,
    name: `Launch ${suffix}`,
    creatorName: "Reef Team",
    creatorSlug: "reef-team",
    coverUrl: collectionArt,
    stage: "live",
    mintPrice: "1 REEF",
    supply: 25,
    startLabel: "Live now",
    description: "Drop record written through the on-chain drop manager."
  })
});
console.error("[e2e] admin drop written");

console.error("[e2e] reading verification payloads");

const soldListings = await waitFor("marketplace sale indexing", async () => {
  const records = await api(
    `/marketplace/orders?collectionAddress=${collectionAddress}&status=sold`
  );
  return records.find((record) => String(record.listingId) === listingId) ? records : null;
});
const sales = await waitFor("sale records", async () => {
  const records = await api("/sales");
  return records.find((record) => String(record.listingId) === listingId) ? records : null;
});
const collectionRecord = await api(`/creator/collections/${collectionSlug}`);
const tokenDataset = await api(`/dataset/tokens?search=${encodeURIComponent(collectionName)}`);
const activeListings = await api(
  `/marketplace/orders?collectionAddress=${collectionAddress}&status=active`
);
const drops = await api("/dataset/drops");

const dropManagerAbi = [
  "function getDrop(string slug) view returns (bool exists, bool archived, uint8 stage, uint256 supply, uint64 updatedAt, string storedSlug, string name, string creatorName, string creatorSlug, string coverUrl, string mintPrice, string startLabel, string description)"
];
const dropManager = new Contract(config.config.contracts.dropManager.address, dropManagerAbi, provider);
const onchainDrop = await dropManager.getDrop(dropSlug);

console.log(
  JSON.stringify(
    {
      ok: true,
      deployed: {
        slug: collectionSlug,
        contractAddress: collectionAddress,
        owner: collectionOwner,
        txHash: deployed.deploymentTxHash
      },
      minted: {
        tokenId,
        txHash: mintTx.hash,
        blockNumber: mintReceipt.blockNumber,
        owner: await collection.ownerOf(tokenId)
      },
      marketplace: {
        marketplaceAddress,
        listingId,
        listingTxHash: createListingTx.hash,
        buyTxHash: buyListingTx.hash,
        buyBlockNumber: buyListingReceipt.blockNumber,
        activeListingsForCollection: Array.isArray(activeListings)
          ? activeListings.length
          : (activeListings.listings?.length ?? null),
        soldListingsForCollection: Array.isArray(soldListings)
          ? soldListings.length
          : (soldListings.listings?.length ?? null),
        salesCount: Array.isArray(sales) ? sales.length : (sales.sales?.length ?? null)
      },
      drop: {
        slug: dropSlug,
        datasetCount: drops.drops?.length ?? null,
        datasetContains: Boolean((drops.drops ?? []).find((entry) => entry.slug === dropSlug)),
        onchainExists: Boolean(onchainDrop.exists),
        onchainName: String(onchainDrop.name)
      },
      apiChecks: {
        collectionReady: collectionRecord.collection?.contractReady,
        tokenSearchCount: tokenDataset.tokens?.length ?? null
      }
    },
    null,
    2
  )
);
