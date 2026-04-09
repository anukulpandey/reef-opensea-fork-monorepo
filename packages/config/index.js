import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseConfigPath = path.join(__dirname, "base-config.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deepMerge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return overrideValue ?? baseValue;
  }

  if (
    baseValue &&
    overrideValue &&
    typeof baseValue === "object" &&
    typeof overrideValue === "object"
  ) {
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(overrideValue)]);
    return Object.fromEntries(
      Array.from(keys).map((key) => [key, deepMerge(baseValue[key], overrideValue[key])])
    );
  }

  return overrideValue ?? baseValue;
}

function resolveCandidate(cwd, relativePath) {
  return path.resolve(cwd, relativePath);
}

function readArtifactIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return readJson(filePath);
}

function envBool(value, fallback = false) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function nonEmpty(value) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeContractRef(baseValue, override = {}) {
  return {
    ...baseValue,
    ...override,
    address: override.address ?? baseValue.address ?? "",
    verified: Boolean(override.verified ?? baseValue.verified)
  };
}

function buildCapability({
  configured,
  envMode,
  runtimeValue,
  officialFactory,
  fallbackFactory,
  officialImplementation = "",
  fallbackImplementation = "",
  officialMarketplaceEnabled,
  fallbackMarketplaceEnabled,
  officialReason,
  fallbackReason
}) {
  if (runtimeValue) {
    return {
      enabled: Boolean(runtimeValue.enabled),
      mode: runtimeValue.mode ?? "blocked",
      factoryAddress: runtimeValue.factoryAddress ?? "",
      implementationAddress: runtimeValue.implementationAddress ?? "",
      marketplaceMode: runtimeValue.marketplaceMode ?? "blocked",
      reason: runtimeValue.reason ?? ""
    };
  }

  if (envMode === "official" || (envMode !== "fallback" && officialFactory.verified && officialFactory.address)) {
    return {
      enabled: true,
      mode: "official",
      factoryAddress: officialFactory.address,
      implementationAddress: officialImplementation,
      marketplaceMode: officialMarketplaceEnabled ? "official" : fallbackMarketplaceEnabled ? "fallback" : "blocked",
      reason: officialMarketplaceEnabled ? "" : officialReason
    };
  }

  if (fallbackFactory.verified && fallbackFactory.address) {
    return {
      enabled: true,
      mode: "fallback",
      factoryAddress: fallbackFactory.address,
      implementationAddress: fallbackImplementation,
      marketplaceMode: fallbackMarketplaceEnabled ? "fallback" : "blocked",
      reason: fallbackMarketplaceEnabled ? "" : fallbackReason
    };
  }

  return {
    ...configured,
    enabled: false,
    mode: "blocked",
    factoryAddress: "",
    implementationAddress: "",
    marketplaceMode: "blocked",
    reason: configured.reason ?? fallbackReason ?? officialReason ?? "Capability is not configured."
  };
}

function buildMarketplaceCapability({
  configured,
  envMode,
  runtimeValue,
  officialContract,
  fallbackContract,
  officialReason,
  fallbackReason
}) {
  if (runtimeValue) {
    return {
      enabled: Boolean(runtimeValue.enabled),
      mode: runtimeValue.mode ?? "blocked",
      address: runtimeValue.address ?? "",
      reason: runtimeValue.reason ?? ""
    };
  }

  if (envMode === "official" || (envMode !== "fallback" && officialContract.verified && officialContract.address)) {
    return {
      enabled: true,
      mode: "official",
      address: officialContract.address,
      reason: ""
    };
  }

  if (fallbackContract.verified && fallbackContract.address) {
    return {
      enabled: true,
      mode: "fallback",
      address: fallbackContract.address,
      reason: ""
    };
  }

  return {
    ...configured,
    enabled: false,
    mode: "blocked",
    address: "",
    reason: configured.reason ?? fallbackReason ?? officialReason ?? "Capability is not configured."
  };
}

function deriveDeploymentMode(runtimeMode, creator721, creator1155, market721, market1155) {
  if (runtimeMode) {
    return runtimeMode;
  }

  const modes = [creator721.mode, creator1155.mode, market721.mode, market1155.mode].filter(
    (value) => value && value !== "blocked"
  );

  if (modes.length === 0) {
    return "blocked";
  }
  if (modes.every((value) => value === "official")) {
    return "official";
  }
  if (modes.every((value) => value === "fallback")) {
    return "fallback";
  }
  return "mixed";
}

function summarizeDeploymentFailure(runtimeArtifact, probeArtifact) {
  const runtimeReasons = [
    runtimeArtifact?.errors?.find((entry) => entry?.reason?.includes("transaction execution reverted"))?.reason,
    runtimeArtifact?.errors?.find((entry) => entry?.reason?.includes("Invalid Transaction"))?.reason,
    runtimeArtifact?.probe?.reason,
    runtimeArtifact?.errors?.[0]?.reason,
    probeArtifact?.error
  ].filter(Boolean);

  const rawReason = runtimeReasons[0] ?? "";

  if (!rawReason) {
    return "";
  }

  if (rawReason.includes("transaction execution reverted")) {
    return "The local Reef RPC is reverting contract creation, so publishing is unavailable in this environment right now.";
  }

  if (rawReason.includes("Invalid Transaction")) {
    return "The local Reef RPC rejected the deployment transaction as invalid.";
  }

  if (rawReason.includes("temporarily banned")) {
    return "The Reef RPC is temporarily banning deployment transactions, so publishing is unavailable right now.";
  }

  if (rawReason.includes("ENOTFOUND") || rawReason.includes("ETIMEDOUT") || rawReason.includes("ECONNREFUSED")) {
    return "The configured Reef RPC is unreachable from the current environment.";
  }

  return rawReason;
}

export function loadBaseConfig() {
  return readJson(baseConfigPath);
}

export function resolveNodeAppConfig(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const base = loadBaseConfig();

  const deploymentArtifactPath = resolveCandidate(
    cwd,
    env.REEF_DEPLOYMENT_FILE ?? base.contracts.artifactPaths.deployment
  );
  const bootstrapArtifactPath = resolveCandidate(
    cwd,
    env.REEF_BOOTSTRAP_FILE ?? base.contracts.artifactPaths.bootstrap
  );
  const probeArtifactPath = resolveCandidate(
    cwd,
    env.REEF_PROBE_FILE ?? base.contracts.artifactPaths.probe
  );
  const runtimeArtifactPath = resolveCandidate(
    cwd,
    env.REEF_RUNTIME_FILE ?? base.contracts.artifactPaths.runtime
  );

  const deploymentArtifact = readArtifactIfExists(deploymentArtifactPath);
  const bootstrapArtifact = readArtifactIfExists(bootstrapArtifactPath);
  const probeArtifact = readArtifactIfExists(probeArtifactPath);
  const runtimeArtifact = readArtifactIfExists(runtimeArtifactPath);

  const services = {
    ...base.services,
    apiBaseUrl: env.API_BASE_URL ?? base.services.apiBaseUrl,
    webBaseUrl: env.WEB_BASE_URL ?? base.services.webBaseUrl,
    ipfsApiUrl: env.IPFS_API_URL ?? base.services.ipfsApiUrl,
    ipfsGatewayUrl: env.IPFS_GATEWAY_URL ?? base.services.ipfsGatewayUrl
  };

  const network = {
    ...base.network,
    chainId: Number(env.REEF_CHAIN_ID ?? base.network.chainId),
    chainName: env.REEF_CHAIN_NAME ?? base.network.chainName,
    rpcUrl:
      env.REEF_RPC_URL ??
      runtimeArtifact?.rpcUrl ??
      deploymentArtifact?.rpcUrl ??
      base.network.rpcUrl
  };

  const official = {
    seaport: normalizeContractRef(base.contracts.official.seaport, {
      address:
        nonEmpty(env.SEAPORT_ADDRESS) ??
        runtimeArtifact?.contracts?.official?.seaport?.address ??
        deploymentArtifact?.seaport ??
        bootstrapArtifact?.seaport ??
        base.contracts.official.seaport.address,
      verified:
        envBool(env.SEAPORT_VERIFIED) ||
        runtimeArtifact?.contracts?.official?.seaport?.verified ||
        deploymentArtifact?.seaportVerified ||
        bootstrapArtifact?.verified
    }),
    conduitController: normalizeContractRef(base.contracts.official.conduitController, {
      address:
        nonEmpty(env.CONDUIT_CONTROLLER_ADDRESS) ??
        runtimeArtifact?.contracts?.official?.conduitController?.address ??
        deploymentArtifact?.conduitController ??
        bootstrapArtifact?.conduitController ??
        base.contracts.official.conduitController.address,
      verified:
        envBool(env.CONDUIT_CONTROLLER_VERIFIED) ||
        runtimeArtifact?.contracts?.official?.conduitController?.verified ||
        deploymentArtifact?.conduitControllerVerified ||
        bootstrapArtifact?.verified
    }),
    seaDrop: normalizeContractRef(base.contracts.official.seaDrop, {
      address:
        nonEmpty(env.SEADROP_ADDRESS) ??
        runtimeArtifact?.contracts?.official?.seaDrop?.address ??
        deploymentArtifact?.seaDrop ??
        base.contracts.official.seaDrop.address,
      verified:
        envBool(env.SEADROP_VERIFIED) ||
        runtimeArtifact?.contracts?.official?.seaDrop?.verified ||
        deploymentArtifact?.seaDropVerified
    }),
    creatorFactory: normalizeContractRef(base.contracts.official.creatorFactory, {
      address:
        nonEmpty(env.CREATOR_FACTORY_ADDRESS) ??
        runtimeArtifact?.contracts?.official?.creatorFactory?.address ??
        deploymentArtifact?.creatorFactory ??
        base.contracts.official.creatorFactory.address,
      verified:
        envBool(env.CREATOR_FACTORY_VERIFIED) ||
        runtimeArtifact?.contracts?.official?.creatorFactory?.verified ||
        deploymentArtifact?.creatorFactoryVerified
    }),
    collectionImplementation: normalizeContractRef(base.contracts.official.collectionImplementation, {
      address:
        nonEmpty(env.COLLECTION_IMPLEMENTATION_ADDRESS) ??
        runtimeArtifact?.contracts?.official?.collectionImplementation?.address ??
        deploymentArtifact?.collectionImplementation ??
        base.contracts.official.collectionImplementation.address,
      verified:
        envBool(env.COLLECTION_IMPLEMENTATION_VERIFIED) ||
        runtimeArtifact?.contracts?.official?.collectionImplementation?.verified ||
        deploymentArtifact?.collectionImplementationVerified
    })
  };

  const fallback = {
    creatorFactory721: normalizeContractRef(base.contracts.fallback.creatorFactory721, {
      address:
        nonEmpty(env.FALLBACK_CREATOR_FACTORY_721_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.creatorFactory721?.address ??
        base.contracts.fallback.creatorFactory721.address,
      verified:
        envBool(env.FALLBACK_CREATOR_FACTORY_721_VERIFIED) ||
        runtimeArtifact?.contracts?.fallback?.creatorFactory721?.verified
    }),
    editionFactory1155: normalizeContractRef(base.contracts.fallback.editionFactory1155, {
      address:
        nonEmpty(env.FALLBACK_EDITION_FACTORY_1155_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.editionFactory1155?.address ??
        base.contracts.fallback.editionFactory1155.address,
      verified:
        envBool(env.FALLBACK_EDITION_FACTORY_1155_VERIFIED) ||
        runtimeArtifact?.contracts?.fallback?.editionFactory1155?.verified
    }),
    marketplace721: normalizeContractRef(base.contracts.fallback.marketplace721, {
      address:
        nonEmpty(env.FALLBACK_MARKETPLACE_721_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.marketplace721?.address ??
        base.contracts.fallback.marketplace721.address,
      verified:
        envBool(env.FALLBACK_MARKETPLACE_721_VERIFIED) ||
        runtimeArtifact?.contracts?.fallback?.marketplace721?.verified
    }),
    marketplace1155: normalizeContractRef(base.contracts.fallback.marketplace1155, {
      address:
        nonEmpty(env.FALLBACK_MARKETPLACE_1155_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.marketplace1155?.address ??
        base.contracts.fallback.marketplace1155.address,
      verified:
        envBool(env.FALLBACK_MARKETPLACE_1155_VERIFIED) ||
        runtimeArtifact?.contracts?.fallback?.marketplace1155?.verified
    }),
    dropManager: normalizeContractRef(base.contracts.fallback.dropManager, {
      address:
        nonEmpty(env.FALLBACK_DROP_MANAGER_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.dropManager?.address ??
        base.contracts.fallback.dropManager.address,
      verified:
        envBool(env.FALLBACK_DROP_MANAGER_VERIFIED) ||
        runtimeArtifact?.contracts?.fallback?.dropManager?.verified
    })
  };

  const deployment = {
    creator: {
      erc721: buildCapability({
        configured: base.deployment.creator.erc721,
        envMode: env.REEF_DEPLOYMENT_MODE,
        runtimeValue: runtimeArtifact?.deployment?.creator?.erc721,
        officialFactory: official.creatorFactory,
        fallbackFactory: fallback.creatorFactory721,
        officialImplementation: official.collectionImplementation.address,
        officialMarketplaceEnabled: Boolean(official.seaport.address && official.seaport.verified),
        fallbackMarketplaceEnabled: Boolean(fallback.marketplace721.address && fallback.marketplace721.verified),
        officialReason: "Official SeaDrop creator contracts are not fully verified on this Reef environment.",
        fallbackReason: "Fallback ERC721 creator factory is not deployed on this Reef environment."
      }),
      erc1155: buildCapability({
        configured: base.deployment.creator.erc1155,
        envMode: "fallback",
        runtimeValue: runtimeArtifact?.deployment?.creator?.erc1155,
        officialFactory: { address: "", verified: false },
        fallbackFactory: fallback.editionFactory1155,
        fallbackMarketplaceEnabled: Boolean(fallback.marketplace1155.address && fallback.marketplace1155.verified),
        officialReason: "Official OpenSea creator ERC1155 contracts are not configured in this repo.",
        fallbackReason: "Fallback ERC1155 creator factory is not deployed on this Reef environment."
      })
    },
    marketplace: {
      erc721: buildMarketplaceCapability({
        configured: base.deployment.marketplace.erc721,
        envMode: env.REEF_DEPLOYMENT_MODE,
        runtimeValue: runtimeArtifact?.deployment?.marketplace?.erc721,
        officialContract: official.seaport,
        fallbackContract: fallback.marketplace721,
        officialReason: "Official Seaport trading is not verified on this Reef environment.",
        fallbackReason: "Fallback ERC721 marketplace is not deployed on this Reef environment."
      }),
      erc1155: buildMarketplaceCapability({
        configured: base.deployment.marketplace.erc1155,
        envMode: "fallback",
        runtimeValue: runtimeArtifact?.deployment?.marketplace?.erc1155,
        officialContract: { address: "", verified: false },
        fallbackContract: fallback.marketplace1155,
        officialReason: "Official Seaport ERC1155 trading is not configured for this environment.",
        fallbackReason: "Fallback ERC1155 marketplace is not deployed on this Reef environment."
      })
    }
  };

  deployment.mode = deriveDeploymentMode(
    env.REEF_DEPLOYMENT_MODE ?? runtimeArtifact?.deployment?.mode,
    deployment.creator.erc721,
    deployment.creator.erc1155,
    deployment.marketplace.erc721,
    deployment.marketplace.erc1155
  );

  const deploymentFailureReason = summarizeDeploymentFailure(runtimeArtifact, probeArtifact);
  if (deploymentFailureReason) {
    if (!deployment.creator.erc721.enabled) {
      deployment.creator.erc721.reason = deploymentFailureReason;
    }
    if (!deployment.creator.erc1155.enabled) {
      deployment.creator.erc1155.reason = deploymentFailureReason;
    }
    if (!deployment.marketplace.erc721.enabled) {
      deployment.marketplace.erc721.reason = deploymentFailureReason;
    }
    if (!deployment.marketplace.erc1155.enabled) {
      deployment.marketplace.erc1155.reason = deploymentFailureReason;
    }
  }

  const rawCollectionAddress =
    nonEmpty(env.COLLECTION_ADDRESS) ??
    deploymentArtifact?.collection ??
    base.contracts.collection.address;
  const collectionVerified =
    envBool(env.COLLECTION_VERIFIED) ||
    Boolean(
      deploymentArtifact?.collectionVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.collection)
    );
  const collectionAddress = collectionVerified ? rawCollectionAddress : "";
  const marketplaceAddress =
    nonEmpty(env.MARKETPLACE_ADDRESS) ??
    runtimeArtifact?.contracts?.fallback?.marketplace721?.address ??
    deployment.marketplace.erc721.address ??
    base.contracts.marketplace.address;
  const marketplaceVerified =
    envBool(env.MARKETPLACE_VERIFIED) ||
    Boolean(
      runtimeArtifact?.contracts?.fallback?.marketplace721?.verified ??
      deploymentArtifact?.marketplaceVerified ??
      deployment.marketplace.erc721.enabled
    );

  const contracts = {
    ...base.contracts,
    official,
    fallback,
    seaport: official.seaport,
    conduitController: official.conduitController,
    seaDrop: official.seaDrop,
    creatorFactory: official.creatorFactory,
    collectionImplementation: official.collectionImplementation,
    marketplace: {
      ...base.contracts.marketplace,
      address: marketplaceAddress,
      verified: marketplaceVerified
    },
    dropManager: {
      ...base.contracts.dropManager,
      address:
        nonEmpty(env.DROP_MANAGER_ADDRESS) ??
        runtimeArtifact?.contracts?.fallback?.dropManager?.address ??
        base.contracts.dropManager.address,
      verified:
        envBool(env.DROP_MANAGER_VERIFIED) ||
        Boolean(
          runtimeArtifact?.contracts?.fallback?.dropManager?.verified ??
          base.contracts.dropManager.verified
        )
    },
    collection: {
      ...base.contracts.collection,
      address: collectionAddress,
      slug:
        nonEmpty(env.COLLECTION_SLUG) ??
        deploymentArtifact?.collectionSlug ??
        base.contracts.collection.slug,
      name:
        nonEmpty(env.COLLECTION_NAME) ??
        deploymentArtifact?.collectionName ??
        base.contracts.collection.name,
      symbol:
        nonEmpty(env.COLLECTION_SYMBOL) ??
        deploymentArtifact?.collectionSymbol ??
        base.contracts.collection.symbol,
      verified: collectionVerified
    },
    artifactPaths: {
      deployment: deploymentArtifactPath,
      bootstrap: bootstrapArtifactPath,
      probe: probeArtifactPath,
      runtime: runtimeArtifactPath
    }
  };

  const storage = {
    ...base.storage,
    rootDir: env.STORAGE_ROOT ?? base.storage.rootDir,
    publicDir: env.STORAGE_PUBLIC_DIR ?? base.storage.publicDir,
    generatedDir: env.STORAGE_GENERATED_DIR ?? base.storage.generatedDir,
    ipfsFallbackDir: env.STORAGE_IPFS_FALLBACK_DIR ?? base.storage.ipfsFallbackDir
  };

  const features = deepMerge(base.features, {
    enableLiveTrading:
      env.ENABLE_LIVE_TRADING === "false"
        ? false
        : env.ENABLE_LIVE_TRADING === "true"
          ? true
          : base.features.enableLiveTrading &&
            (deployment.marketplace.erc721.enabled || deployment.marketplace.erc1155.enabled)
  });

  return {
    site: base.site,
    network,
    contracts,
    deployment,
    services,
    storage,
    features,
    references: {
      projectOpenSeaRoot: path.resolve(cwd, "external/projectopensea")
    },
    artifacts: {
      deployment: deploymentArtifact,
      bootstrap: bootstrapArtifact,
      probe: probeArtifact,
      runtime: runtimeArtifact
    }
  };
}

export function buildPublicConfig(nodeConfig) {
  const publicRpcUrl = nodeConfig.network.rpcUrl.includes("host.docker.internal")
    ? nodeConfig.network.rpcUrl.replace("host.docker.internal", "127.0.0.1")
    : nodeConfig.network.rpcUrl;

  return {
    site: nodeConfig.site,
    network: {
      ...nodeConfig.network,
      rpcUrl: publicRpcUrl
    },
    contracts: nodeConfig.contracts,
    deployment: nodeConfig.deployment,
    services: {
      apiBaseUrl: nodeConfig.services.apiBaseUrl,
      webBaseUrl: nodeConfig.services.webBaseUrl,
      ipfsGatewayUrl: nodeConfig.services.ipfsGatewayUrl
    },
    storage: {
      publicBasePath: nodeConfig.storage.publicBasePath
    },
    features: nodeConfig.features
  };
}
