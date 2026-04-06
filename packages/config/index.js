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
      Array.from(keys).map((key) => [
        key,
        deepMerge(baseValue[key], overrideValue[key])
      ])
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

  const deploymentArtifact = readArtifactIfExists(deploymentArtifactPath);
  const bootstrapArtifact = readArtifactIfExists(bootstrapArtifactPath);
  const probeArtifact = readArtifactIfExists(probeArtifactPath);

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
    rpcUrl: env.REEF_RPC_URL ?? deploymentArtifact?.rpcUrl ?? base.network.rpcUrl
  };

  const seaportAddress =
    env.SEAPORT_ADDRESS ??
    deploymentArtifact?.seaport ??
    bootstrapArtifact?.seaport ??
    base.contracts.seaport.address;
  const conduitControllerAddress =
    env.CONDUIT_CONTROLLER_ADDRESS ??
    deploymentArtifact?.conduitController ??
    bootstrapArtifact?.conduitController ??
    base.contracts.conduitController.address;
  const seaDropAddress =
    env.SEADROP_ADDRESS ??
    deploymentArtifact?.seaDrop ??
    base.contracts.seaDrop.address;
  const creatorFactoryAddress =
    env.CREATOR_FACTORY_ADDRESS ??
    deploymentArtifact?.creatorFactory ??
    base.contracts.creatorFactory.address;
  const collectionImplementationAddress =
    env.COLLECTION_IMPLEMENTATION_ADDRESS ??
    deploymentArtifact?.collectionImplementation ??
    base.contracts.collectionImplementation.address;
  const collectionAddress =
    env.COLLECTION_ADDRESS ??
    deploymentArtifact?.collection ??
    base.contracts.collection.address;
  const marketplaceAddress =
    env.MARKETPLACE_ADDRESS ??
    deploymentArtifact?.marketplace ??
    base.contracts.marketplace.address;

  const seaportVerified =
    env.SEAPORT_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.verified ||
      bootstrapArtifact?.verified ||
      (deploymentArtifact?.seaport && bootstrapArtifact?.verified)
    );
  const collectionVerified =
    env.COLLECTION_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.collectionVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.collection)
    );
  const seaDropVerified =
    env.SEADROP_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.seaDropVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.seaDrop)
    );
  const creatorFactoryVerified =
    env.CREATOR_FACTORY_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.creatorFactoryVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.creatorFactory)
    );
  const collectionImplementationVerified =
    env.COLLECTION_IMPLEMENTATION_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.collectionImplementationVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.collectionImplementation)
    );
  const marketplaceVerified =
    env.MARKETPLACE_VERIFIED === "true" ||
    Boolean(
      deploymentArtifact?.marketplaceVerified ??
      (deploymentArtifact?.verified && deploymentArtifact?.marketplace)
    );

  const contracts = {
    ...base.contracts,
    seaport: {
      ...base.contracts.seaport,
      address: seaportAddress,
      verified: seaportVerified
    },
    conduitController: {
      ...base.contracts.conduitController,
      address: conduitControllerAddress,
      verified: seaportVerified
    },
    seaDrop: {
      ...base.contracts.seaDrop,
      address: seaDropAddress,
      verified: seaDropVerified
    },
    creatorFactory: {
      ...base.contracts.creatorFactory,
      address: creatorFactoryAddress,
      verified: creatorFactoryVerified
    },
    collectionImplementation: {
      ...base.contracts.collectionImplementation,
      address: collectionImplementationAddress,
      verified: collectionImplementationVerified
    },
    marketplace: {
      ...base.contracts.marketplace,
      address: marketplaceAddress,
      verified: marketplaceVerified
    },
    collection: {
      ...base.contracts.collection,
      address: collectionAddress,
      slug: env.COLLECTION_SLUG ?? deploymentArtifact?.collectionSlug ?? base.contracts.collection.slug,
      name: env.COLLECTION_NAME ?? deploymentArtifact?.collectionName ?? base.contracts.collection.name,
      symbol: env.COLLECTION_SYMBOL ?? deploymentArtifact?.collectionSymbol ?? base.contracts.collection.symbol,
      verified: collectionVerified
    },
    artifactPaths: {
      deployment: deploymentArtifactPath,
      bootstrap: bootstrapArtifactPath,
      probe: probeArtifactPath
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
      env.ENABLE_LIVE_TRADING === "true"
        ? true
        : base.features.enableLiveTrading && collectionVerified && marketplaceVerified
  });

  return {
    site: base.site,
    network,
    contracts,
    services,
    storage,
    features,
    references: {
      projectOpenSeaRoot: path.resolve(cwd, "external/projectopensea")
    },
    artifacts: {
      deployment: deploymentArtifact,
      bootstrap: bootstrapArtifact,
      probe: probeArtifact
    }
  };
}

export function buildPublicConfig(nodeConfig) {
  return {
    site: nodeConfig.site,
    network: nodeConfig.network,
    contracts: nodeConfig.contracts,
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
