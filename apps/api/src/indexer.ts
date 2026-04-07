import { Contract, Interface, JsonRpcProvider, ZeroAddress } from "ethers";

import { config, nodeConfig } from "./config.js";
import {
  getNft,
  getSyncState,
  insertSale,
  insertTransfer,
  markListingCancelled,
  markListingSold,
  setSyncState,
  upsertListingCreated,
  upsertNft,
  updateNftOwner
} from "./db.js";
import { readJsonFromIpfs, toGatewayUrl } from "./ipfs.js";
import {
  markContractReady,
  markContractUnavailable,
  runtimeState,
  setIndexerState
} from "./runtime.js";

const provider = new JsonRpcProvider(config.rpcUrl, Number(nodeConfig.network.chainId));

const collectionInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 indexed id)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
]);

const marketplaceInterface = new Interface([
  "event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed collection, uint256 tokenId, uint256 price)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller, address indexed collection, uint256 tokenId)",
  "event ListingPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, address collection, uint256 tokenId, uint256 price)"
]);

const collectionContract = new Contract(
  nodeConfig.contracts.collection.address || ZeroAddress,
  collectionInterface,
  provider
);

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return toGatewayUrl(value);
}

async function readMetadata(tokenUri: string) {
  if (!tokenUri) {
    return {
      name: "",
      description: "",
      image: "",
      attributes: []
    };
  }

  if (tokenUri.startsWith("ipfs://")) {
    const metadata = await readJsonFromIpfs(tokenUri);
    return {
      name: String(metadata.name ?? ""),
      description: String(metadata.description ?? ""),
      image: normalizeImageUrl(metadata.image),
      attributes: Array.isArray(metadata.attributes)
        ? metadata.attributes.filter((entry) => typeof entry === "object" && entry !== null) as Array<{ trait_type?: string; value?: string }>
        : []
    };
  }

  if (tokenUri.startsWith("data:")) {
    return {
      name: "",
      description: "",
      image: tokenUri,
      attributes: []
    };
  }

  const response = await fetch(tokenUri);
  if (!response.ok) {
    throw new Error(`Metadata fetch failed with status ${response.status}`);
  }
  const metadata = await response.json() as Record<string, unknown>;
  return {
    name: String(metadata.name ?? ""),
    description: String(metadata.description ?? ""),
    image: normalizeImageUrl(metadata.image),
    attributes: Array.isArray(metadata.attributes)
      ? metadata.attributes.filter((entry) => typeof entry === "object" && entry !== null) as Array<{ trait_type?: string; value?: string }>
      : []
  };
}

async function syncTokenRecord(tokenId: string, ownerAddress: string, mintedTo?: string) {
  const existing = await getNft(nodeConfig.contracts.collection.address, tokenId);
  const tokenUri = await collectionContract.tokenURI(tokenId);
  const metadata = await readMetadata(String(tokenUri));

  await upsertNft({
    collectionSlug: nodeConfig.contracts.collection.slug,
    collectionAddress: nodeConfig.contracts.collection.address,
    tokenId,
    name: metadata.name || `${nodeConfig.contracts.collection.name} #${tokenId}`,
    description: metadata.description,
    imageUrl: metadata.image,
    metadataUri: String(tokenUri),
    ownerAddress,
    creatorAddress: existing?.creatorAddress || mintedTo || ownerAddress,
    attributes: metadata.attributes,
    mintedAt: existing?.mintedAt
  });
}

async function getStartBlock(stateKey: string) {
  const saved = await getSyncState(stateKey);
  if (!saved) {
    return Math.max((await provider.getBlockNumber()) - 2_000, 0);
  }
  return Number(saved);
}

async function verifyContract(contract: "collection" | "marketplace", address: string) {
  if (!address) {
    markContractUnavailable(contract, `${contract} address is not configured`);
    return false;
  }

  try {
    const code = await provider.getCode(address);
    if (code === "0x") {
      markContractUnavailable(contract, `${contract} has no bytecode at ${address}`);
      return false;
    }

    markContractReady(contract);
    return true;
  } catch (error) {
    markContractUnavailable(contract, error);
    return false;
  }
}

async function syncCollectionTransfers() {
  const latestBlock = await provider.getBlockNumber();
  let fromBlock = await getStartBlock("collection_last_indexed_block");

  if (fromBlock > latestBlock) {
    fromBlock = latestBlock;
  }

  const toBlock = Math.min(fromBlock + 500, latestBlock);
  if (toBlock < fromBlock) {
    return;
  }

  const transferTopic = collectionInterface.getEvent("Transfer")?.topicHash;
  if (!transferTopic) {
    throw new Error("Transfer event topic unavailable");
  }

  const logs = await provider.getLogs({
    address: nodeConfig.contracts.collection.address,
    topics: [transferTopic],
    fromBlock,
    toBlock
  });

  for (const log of logs) {
    const parsed = collectionInterface.parseLog(log);
    const from = String(parsed?.args.from ?? ZeroAddress).toLowerCase();
    const to = String(parsed?.args.to ?? ZeroAddress).toLowerCase();
    const tokenId = String(parsed?.args.id ?? "0");
    const eventType = from === ZeroAddress.toLowerCase() ? "mint" : "transfer";

    await insertTransfer({
      txHash: log.transactionHash,
      logIndex: Number(log.index),
      collectionAddress: nodeConfig.contracts.collection.address,
      tokenId,
      fromAddress: from,
      toAddress: to,
      eventType,
      blockNumber: Number(log.blockNumber)
    });

    await syncTokenRecord(tokenId, to, eventType === "mint" ? to : undefined);
    await updateNftOwner({
      collectionAddress: nodeConfig.contracts.collection.address,
      tokenId,
      ownerAddress: to
    });
  }

  await setSyncState("collection_last_indexed_block", String(toBlock + 1));
}

async function syncMarketplaceEvents() {
  const latestBlock = await provider.getBlockNumber();
  let fromBlock = await getStartBlock("marketplace_last_indexed_block");

  if (fromBlock > latestBlock) {
    fromBlock = latestBlock;
  }

  const toBlock = Math.min(fromBlock + 500, latestBlock);
  if (toBlock < fromBlock) {
    return;
  }

  const logs = await provider.getLogs({
    address: nodeConfig.contracts.marketplace.address,
    fromBlock,
    toBlock
  });

  for (const log of logs) {
    const parsed = marketplaceInterface.parseLog(log);
    if (!parsed) {
      continue;
    }

    if (parsed.name === "ListingCreated") {
      await upsertListingCreated({
        listingId: String(parsed.args.listingId),
        marketplaceAddress: String(parsed.args.collection).toLowerCase() === nodeConfig.contracts.collection.address.toLowerCase()
          ? nodeConfig.contracts.marketplace.address
          : nodeConfig.contracts.marketplace.address,
        collectionAddress: String(parsed.args.collection),
        tokenId: String(parsed.args.tokenId),
        seller: String(parsed.args.seller),
        priceRaw: String(parsed.args.price),
        txHash: log.transactionHash,
        blockNumber: Number(log.blockNumber)
      });
      continue;
    }

    if (parsed.name === "ListingCancelled") {
      await markListingCancelled(String(parsed.args.listingId));
      continue;
    }

    if (parsed.name === "ListingPurchased") {
      const listingId = String(parsed.args.listingId);
      const buyer = String(parsed.args.buyer);
      const seller = String(parsed.args.seller);
      const collectionAddress = String(parsed.args.collection);
      const tokenId = String(parsed.args.tokenId);
      const priceRaw = String(parsed.args.price);

      await markListingSold({ listingId, buyer });
      await insertSale({
        txHash: log.transactionHash,
        listingId,
        collectionAddress,
        tokenId,
        seller,
        buyer,
        priceRaw,
        blockNumber: Number(log.blockNumber),
        logIndex: Number(log.index)
      });
    }
  }

  await setSyncState("marketplace_last_indexed_block", String(toBlock + 1));
}

async function syncOnce() {
  if (runtimeState.contracts.collection) {
    await syncCollectionTransfers();
  }
  if (runtimeState.contracts.marketplace) {
    await syncMarketplaceEvents();
  }
  setIndexerState({
    enabled: true,
    lastIndexedBlock: await provider.getBlockNumber()
  });
}

export async function startIndexer() {
  const collectionReady = await verifyContract(
    "collection",
    nodeConfig.contracts.collection.address
  );
  const marketplaceReady = await verifyContract(
    "marketplace",
    nodeConfig.contracts.marketplace.address
  );

  if (!collectionReady && !marketplaceReady) {
    console.warn("Indexer disabled because Reef contracts are not live on the configured RPC.");
    setIndexerState({
      enabled: false,
      reason: "No verifiable collection or marketplace contract is configured for indexing."
    });
    return;
  }

  await syncOnce();
  setInterval(() => {
    void syncOnce().catch((error) => {
      console.error("Indexer sync failed", error);
      setIndexerState({
        enabled: false,
        reason: error instanceof Error ? error.message : String(error)
      });
    });
  }, 10_000);
}
