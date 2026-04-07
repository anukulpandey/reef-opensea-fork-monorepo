type CoreContractKey = "collection" | "marketplace";
type CapabilityDomain = "creator" | "marketplace";
type CapabilityStandard = "erc721" | "erc1155";

type CapabilityStatus = {
  enabled: boolean;
  mode: "official" | "fallback" | "mixed" | "blocked";
  address?: string;
  factoryAddress?: string;
  implementationAddress?: string;
  marketplaceMode?: "official" | "fallback" | "mixed" | "blocked";
  reason?: string;
};

type RuntimeState = {
  databaseReady: boolean;
  ipfsReady: boolean;
  storageReady: boolean;
  contracts: Record<CoreContractKey, boolean>;
  capabilities: Record<CapabilityDomain, Record<CapabilityStandard, CapabilityStatus>>;
  deploymentMode: "official" | "fallback" | "mixed" | "blocked";
  databaseReason?: string;
  ipfsReason?: string;
  storageReason?: string;
  contractReasons: Partial<Record<CoreContractKey, string>>;
  indexer: {
    enabled: boolean;
    lastIndexedBlock: number;
    reason?: string;
  };
};

const blockedCapability = (): CapabilityStatus => ({
  enabled: false,
  mode: "blocked",
  reason: "Capability is unavailable."
});

export const runtimeState: RuntimeState = {
  databaseReady: false,
  ipfsReady: false,
  storageReady: false,
  contracts: {
    collection: false,
    marketplace: false
  },
  capabilities: {
    creator: {
      erc721: blockedCapability(),
      erc1155: blockedCapability()
    },
    marketplace: {
      erc721: blockedCapability(),
      erc1155: blockedCapability()
    }
  },
  deploymentMode: "blocked",
  contractReasons: {},
  indexer: {
    enabled: false,
    lastIndexedBlock: 0
  }
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

export function markContractReady(contract: CoreContractKey) {
  runtimeState.contracts[contract] = true;
  delete runtimeState.contractReasons[contract];
}

export function markContractUnavailable(contract: CoreContractKey, reason: unknown) {
  runtimeState.contracts[contract] = false;
  runtimeState.contractReasons[contract] =
    reason instanceof Error ? reason.message : String(reason);
}

export function setCapability(
  domain: CapabilityDomain,
  standard: CapabilityStandard,
  capability: CapabilityStatus
) {
  runtimeState.capabilities[domain][standard] = capability;
}

export function setDeploymentMode(mode: RuntimeState["deploymentMode"]) {
  runtimeState.deploymentMode = mode;
}

export function setIndexerState(input: {
  enabled: boolean;
  lastIndexedBlock?: number;
  reason?: string;
}) {
  runtimeState.indexer = {
    enabled: input.enabled,
    lastIndexedBlock: input.lastIndexedBlock ?? runtimeState.indexer.lastIndexedBlock,
    reason: input.reason
  };
}
