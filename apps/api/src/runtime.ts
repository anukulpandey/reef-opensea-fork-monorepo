export type RuntimeOrderRecord = {
  orderHash: string;
  collectionAddress: string;
  tokenId: string;
  maker: string;
  priceRaw: string;
  currencyAddress: string;
  signature: string;
  order: unknown;
  status: string;
  createdAt: string;
};

export type RuntimeSaleRecord = {
  txHash: string;
  orderHash: string;
  collectionAddress: string;
  tokenId: string;
  seller: string;
  buyer: string;
  currencyAddress: string;
  priceRaw: string;
  blockNumber: number;
  createdAt: string;
};

type RuntimeState = {
  databaseReady: boolean;
  ipfsReady: boolean;
  storageReady: boolean;
  databaseReason?: string;
  ipfsReason?: string;
  storageReason?: string;
};

export const runtimeState: RuntimeState = {
  databaseReady: false,
  ipfsReady: false,
  storageReady: false
};

const orderStore = new Map<string, RuntimeOrderRecord>();
const saleStore: RuntimeSaleRecord[] = [];

export function markDatabaseReady() {
  runtimeState.databaseReady = true;
  runtimeState.databaseReason = undefined;
}

export function markDatabaseUnavailable(reason: unknown) {
  runtimeState.databaseReady = false;
  runtimeState.databaseReason = reason instanceof Error ? reason.message : String(reason);
}

export function markIpfsReady() {
  runtimeState.ipfsReady = true;
  runtimeState.ipfsReason = undefined;
}

export function markIpfsUnavailable(reason: unknown) {
  runtimeState.ipfsReady = false;
  runtimeState.ipfsReason = reason instanceof Error ? reason.message : String(reason);
}

export function markStorageReady() {
  runtimeState.storageReady = true;
  runtimeState.storageReason = undefined;
}

export function markStorageUnavailable(reason: unknown) {
  runtimeState.storageReady = false;
  runtimeState.storageReason = reason instanceof Error ? reason.message : String(reason);
}

export function listRuntimeOrders(filters?: {
  collectionAddress?: string;
  status?: string;
}) {
  const normalizedCollectionAddress = filters?.collectionAddress?.toLowerCase();
  const normalizedStatus = filters?.status ?? "active";

  return Array.from(orderStore.values())
    .filter((order) => order.status === normalizedStatus)
    .filter((order) => {
      if (!normalizedCollectionAddress) {
        return true;
      }
      return order.collectionAddress === normalizedCollectionAddress;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function upsertRuntimeOrder(order: RuntimeOrderRecord) {
  orderStore.set(order.orderHash, order);
}

export function listRuntimeSales(limit = 50) {
  return saleStore
    .slice()
    .sort((left, right) => right.blockNumber - left.blockNumber)
    .slice(0, limit);
}

export function insertRuntimeSale(sale: RuntimeSaleRecord) {
  saleStore.unshift(sale);
}
