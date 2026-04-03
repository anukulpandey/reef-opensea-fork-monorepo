import { Interface, JsonRpcProvider, Log } from "ethers";

import { config, nodeConfig } from "./config.js";
import { isDatabaseReady, pool } from "./db.js";
import { runtimeState } from "./runtime.js";

const provider = new JsonRpcProvider(config.rpcUrl, Number(nodeConfig.network.chainId));

const seaportInterface = new Interface([
  "event OrderFulfilled(bytes32 orderHash, address offerer, address zone, address recipient, tuple(uint8 itemType,address token,uint256 identifier,uint256 amount)[] offer, tuple(uint8 itemType,address token,uint256 identifier,uint256 amount,address recipient)[] consideration)"
]);

const orderFulfilledEvent = seaportInterface.getEvent("OrderFulfilled");
if (!orderFulfilledEvent) {
  throw new Error("OrderFulfilled event not found in Seaport interface");
}
const orderFulfilledTopic = orderFulfilledEvent.topicHash;
const NFT_ITEM_TYPES = new Set([2, 4]);

type ParsedSpentItem = {
  itemType: bigint;
  token: string;
  identifier: bigint;
  amount: bigint;
};

type ParsedReceivedItem = ParsedSpentItem & {
  recipient: string;
};

function extractSaleDetails(parsedLog: ReturnType<Interface["parseLog"]>) {
  const offerItems = (parsedLog?.args.offer ?? []) as ParsedSpentItem[];
  const considerationItems = (parsedLog?.args.consideration ?? []) as ParsedReceivedItem[];

  const nftItem =
    offerItems.find((item: ParsedSpentItem) => NFT_ITEM_TYPES.has(Number(item.itemType))) ??
    considerationItems.find((item: ParsedReceivedItem) => NFT_ITEM_TYPES.has(Number(item.itemType)));

  const paymentItem =
    considerationItems.find((item: ParsedReceivedItem) => !NFT_ITEM_TYPES.has(Number(item.itemType))) ??
    offerItems.find((item: ParsedSpentItem) => !NFT_ITEM_TYPES.has(Number(item.itemType)));

  if (!nftItem || !paymentItem) {
    return null;
  }

  return {
    orderHash: String(parsedLog?.args.orderHash),
    collectionAddress: String(nftItem.token).toLowerCase(),
    tokenId: nftItem.identifier.toString(),
    seller: String(parsedLog?.args.offerer).toLowerCase(),
    buyer: String(parsedLog?.args.recipient).toLowerCase(),
    currencyAddress: String(paymentItem.token).toLowerCase(),
    priceRaw: paymentItem.amount.toString()
  };
}

async function getLastIndexedBlock() {
  const result = await pool.query(
    "SELECT state_value FROM sync_state WHERE state_key = 'last_indexed_block'"
  );
  if (result.rowCount === 0) {
    return Math.max((await provider.getBlockNumber()) - 2_000, 0);
  }
  return Number(result.rows[0].state_value);
}

async function setLastIndexedBlock(blockNumber: number) {
  await pool.query(
    `
      INSERT INTO sync_state (state_key, state_value)
      VALUES ('last_indexed_block', $1)
      ON CONFLICT (state_key)
      DO UPDATE SET state_value = EXCLUDED.state_value
    `,
    [String(blockNumber)]
  );
}

async function persistSale(log: Log) {
  const parsedLog = seaportInterface.parseLog(log);
  const sale = extractSaleDetails(parsedLog);

  if (!sale) {
    return;
  }

  await pool.query(
    `
      INSERT INTO sales (
        tx_hash,
        order_hash,
        collection_address,
        token_id,
        seller,
        buyer,
        currency_address,
        price_raw,
        block_number,
        log_index
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (tx_hash) DO NOTHING
    `,
    [
      log.transactionHash.toLowerCase(),
      sale.orderHash,
      sale.collectionAddress,
      sale.tokenId,
      sale.seller,
      sale.buyer,
      sale.currencyAddress,
      sale.priceRaw,
      Number(log.blockNumber),
      Number(log.index)
    ]
  );

  await pool.query(
    "UPDATE orders SET status = 'filled', updated_at = NOW() WHERE order_hash = $1",
    [sale.orderHash]
  );
}

async function syncOnce() {
  const latestBlock = await provider.getBlockNumber();
  let fromBlock = await getLastIndexedBlock();

  if (fromBlock > latestBlock) {
    fromBlock = latestBlock;
  }

  const toBlock = Math.min(fromBlock + 500, latestBlock);

  if (toBlock < fromBlock) {
    return;
  }

  const logs = await provider.getLogs({
    address: nodeConfig.contracts.seaport.address,
    topics: [orderFulfilledTopic],
    fromBlock,
    toBlock
  });

  for (const log of logs) {
    await persistSale(log);
  }

  await setLastIndexedBlock(toBlock + 1);
}

export async function startIndexer() {
  if (!isDatabaseReady()) {
    console.warn("Indexer disabled because the database is not available.");
    return;
  }

  if (!nodeConfig.contracts.seaport.address) {
    console.warn("Indexer disabled because the Seaport address is not configured.");
    return;
  }

  const seaportCode = await provider.getCode(nodeConfig.contracts.seaport.address);
  if (seaportCode === "0x") {
    console.warn("Indexer disabled because Seaport is not deployed on the current Reef RPC.");
    return;
  }

  await syncOnce();
  setInterval(() => {
    void syncOnce().catch((error) => {
      runtimeState.databaseReason = error instanceof Error ? error.message : String(error);
      console.error("Indexer sync failed", error);
    });
  }, 10_000);
}
