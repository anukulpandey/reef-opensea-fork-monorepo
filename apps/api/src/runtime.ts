type ContractKey = "collection" | "marketplace";

type RuntimeState = {
  databaseReady: boolean;
  ipfsReady: boolean;
  storageReady: boolean;
  contracts: Record<ContractKey, boolean>;
  databaseReason?: string;
  ipfsReason?: string;
  storageReason?: string;
  contractReasons: Partial<Record<ContractKey, string>>;
};

export const runtimeState: RuntimeState = {
  databaseReady: false,
  ipfsReady: false,
  storageReady: false,
  contracts: {
    collection: false,
    marketplace: false
  },
  contractReasons: {}
};

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

export function markContractReady(contract: ContractKey) {
  runtimeState.contracts[contract] = true;
  delete runtimeState.contractReasons[contract];
}

export function markContractUnavailable(contract: ContractKey, reason: unknown) {
  runtimeState.contracts[contract] = false;
  runtimeState.contractReasons[contract] =
    reason instanceof Error ? reason.message : String(reason);
}
