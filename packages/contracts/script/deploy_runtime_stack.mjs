import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { AbiCoder, JsonRpcProvider, TransactionReceipt, Wallet } from "ethers";
import { resolveNodeAppConfig } from "@reef/config";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const configuredRpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const rpcUrl =
  configuredRpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? configuredRpcUrl.replace("host.docker.internal", "127.0.0.1")
    : configuredRpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const chainName = process.env.REEF_CHAIN_NAME ?? appConfig.network.chainName;
const privateKey = process.env.PRIVATE_KEY;
const deployProcessTimeoutMs = Number(process.env.REEF_DEPLOY_MAX_WAIT_SECS ?? "600") * 1_000;
const gasLimitHeadroomNumerator = 11n;
const gasLimitHeadroomDenominator = 10n;
const broadcastVisibilityTimeoutMs = 15_000;
const broadcastVisibilityPollMs = 1_500;
const minimumReefMaxFeePerGasWei = BigInt(
  process.env.REEF_MIN_MAX_FEE_PER_GAS_WEI ?? "1000000000"
);
const forceLegacyReefFees = process.env.REEF_FORCE_LEGACY_FEES?.trim() !== "0";

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const outDir = path.join(rootDir, "packages/contracts/out");
const runtimeArtifactPath = path.resolve(
  rootDir,
  process.env.REEF_RUNTIME_FILE ?? appConfig.contracts.artifactPaths.runtime
);
const bootstrapPath = path.resolve(
  rootDir,
  process.env.REEF_BOOTSTRAP_FILE ?? appConfig.contracts.artifactPaths.bootstrap
);
const deploymentPath = path.resolve(
  rootDir,
  process.env.REEF_DEPLOYMENT_FILE ?? appConfig.contracts.artifactPaths.deployment
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readArtifactIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return readJson(filePath);
}

function maxBigInt(left, right) {
  if (right === undefined) {
    return left;
  }
  return left > right ? left : right;
}

function addGasHeadroom(gasLimit) {
  return (gasLimit * gasLimitHeadroomNumerator) / gasLimitHeadroomDenominator + 1n;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function receiptSummary(receipt) {
  return JSON.stringify({
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    contractAddress: receipt.contractAddress,
    gasUsed: receipt.gasUsed.toString()
  });
}

function resolveConfiguredGasLimit(...envKeys) {
  for (const envKey of envKeys) {
    const rawValue = process.env[envKey]?.trim();
    if (rawValue) {
      return BigInt(rawValue);
    }
  }
  return undefined;
}

async function resolveFeeOverrides(attempt) {
  const configuredGasPrice = process.env.REEF_GAS_PRICE_WEI?.trim();
  const replacementMultiplier = 2n ** BigInt(attempt);
  const legacyReplacementMultiplier = replacementMultiplier + 1n;

  if (configuredGasPrice) {
    const baseGasPrice = BigInt(configuredGasPrice);
    return {
      type: 0,
      gasPrice: maxBigInt(
        baseGasPrice * legacyReplacementMultiplier,
        minimumReefMaxFeePerGasWei
      )
    };
  }

  const feeData = await provider.getFeeData();
  const resolvedGasPrice = feeData.gasPrice ?? 100_000_000n;
  if (forceLegacyReefFees) {
    return {
      type: 0,
      gasPrice: maxBigInt(
        resolvedGasPrice * legacyReplacementMultiplier,
        minimumReefMaxFeePerGasWei
      )
    };
  }

  if (feeData.maxFeePerGas != null) {
    const maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas != null && feeData.maxPriorityFeePerGas > 0n
        ? feeData.maxPriorityFeePerGas
        : minimumReefMaxFeePerGasWei;
    return {
      maxFeePerGas: maxBigInt(
        feeData.maxFeePerGas * legacyReplacementMultiplier,
        minimumReefMaxFeePerGasWei
      ),
      maxPriorityFeePerGas: maxBigInt(
        maxPriorityFeePerGas * legacyReplacementMultiplier,
        minimumReefMaxFeePerGasWei
      )
    };
  }

  return {
    gasPrice: maxBigInt(
      resolvedGasPrice * legacyReplacementMultiplier,
      minimumReefMaxFeePerGasWei
    )
  };
}

function findArtifact(contractName) {
  const stack = [outDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === `${contractName}.json`) {
        return readJson(fullPath);
      }
    }
  }
  throw new Error(`Artifact not found for ${contractName}. Run forge build first.`);
}

async function ensureCode(address) {
  if (!address) {
    return false;
  }
  try {
    const code = await provider.getCode(address);
    return code !== "0x";
  } catch {
    return false;
  }
}

async function ensureTransactionVisible(txHash) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < broadcastVisibilityTimeoutMs) {
    const transaction = await provider.getTransaction(txHash).catch(() => null);
    if (transaction) {
      return;
    }
    await sleep(broadcastVisibilityPollMs);
  }

  throw new Error(
    `Reef returned tx hash ${txHash}, but the RPC never surfaced the transaction back for receipt tracking.`
  );
}

async function submitReefTransaction({ inputHex, txTo, expectedCodeAddress, gasLimit }) {
  const attemptCount = 4;
  let lastError = null;
  const txRequest = txTo ? { to: txTo, data: inputHex } : { data: inputHex };
  const relayedNonce = await provider.getTransactionCount(wallet.address, "pending");

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    try {
      console.error(
        `[reef-runtime] estimating gas attempt ${attempt + 1}/${attemptCount} for ${
          txTo ? txTo : "contract creation"
        }`
      );
      const estimatedGas = await provider.estimateGas({
        from: wallet.address,
        ...txRequest
      });
      const resolvedGasLimit = maxBigInt(addGasHeadroom(estimatedGas), gasLimit);
      const feeOverrides = await resolveFeeOverrides(attempt);
      console.error(
        `[reef-runtime] sending tx with gasLimit=${resolvedGasLimit.toString()} for ${
          txTo ? txTo : "contract creation"
        }`
      );
      const response = await wallet.sendTransaction({
        ...txRequest,
        nonce: relayedNonce,
        gasLimit: resolvedGasLimit,
        ...feeOverrides
      });
      await ensureTransactionVisible(response.hash);
      console.error(`[reef-runtime] waiting for receipt ${response.hash}`);
      const receipt = await provider.waitForTransaction(
        response.hash,
        1,
        deployProcessTimeoutMs
      );

      if (!receipt) {
        throw new Error(
          `Timed out while waiting for Reef to confirm ${response.hash} within ${Math.round(
            deployProcessTimeoutMs / 1000
          )}s.`
        );
      }

      if (receipt.status !== 1) {
        throw new Error(`transaction failed receipt: ${receiptSummary(receipt)}`);
      }

      return {
        txHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber ?? 0),
        contractAddress: (
          receipt.contractAddress ??
          expectedCodeAddress ??
          txTo ??
          ""
        ).toLowerCase()
      };
    } catch (error) {
      lastError = error;
      const detail = error instanceof Error ? error.message : String(error);
      if (
        attempt < attemptCount - 1 &&
        (
          /temporarily banned/i.test(detail) ||
          /priority is too low/i.test(detail) ||
          /never surfaced the transaction back/i.test(detail)
        )
      ) {
        console.warn(
          `Retrying Reef deployment attempt ${attempt + 2}/${attemptCount} after transient rejection: ${detail}`
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function deployArtifact(contractName, args = [], gasLimit) {
  console.error(`[reef-runtime] deploying ${contractName}`);
  const artifact = findArtifact(contractName);
  const encodedArgs = args.length
    ? AbiCoder.defaultAbiCoder().encode(
        args.map((arg) => arg.type),
        args.map((arg) => arg.value)
      )
    : "0x";
  const initCode = artifact.bytecode.object + encodedArgs.slice(2);

  const deployment = await submitReefTransaction({
    inputHex: initCode,
    gasLimit
  });
  const address = deployment.contractAddress;
  const verified = await ensureCode(address);
  if (!verified) {
    throw new Error(`${contractName} deployed but no bytecode was found at ${address}.`);
  }
  return {
    address,
    verified,
    txHash: deployment.txHash,
    blockNumber: deployment.blockNumber
  };
}

async function loadOfficialContracts() {
  const bootstrapArtifact = readArtifactIfExists(bootstrapPath);
  const deploymentArtifact = readArtifactIfExists(deploymentPath);
  const official = {
    seaport: {
      address: bootstrapArtifact?.seaport ?? deploymentArtifact?.seaport ?? "",
      verified: false
    },
    conduitController: {
      address: bootstrapArtifact?.conduitController ?? deploymentArtifact?.conduitController ?? "",
      verified: false
    },
    seaDrop: {
      address: deploymentArtifact?.seaDrop ?? "",
      verified: false
    },
    creatorFactory: {
      address: deploymentArtifact?.creatorFactory ?? "",
      verified: false
    },
    collectionImplementation: {
      address: deploymentArtifact?.collectionImplementation ?? "",
      verified: false
    }
  };

  for (const key of Object.keys(official)) {
    official[key].verified = await ensureCode(official[key].address);
  }

  return official;
}

function deriveMode(creator721, creator1155, market721, market1155) {
  const modes = [creator721.mode, creator1155.mode, market721.mode, market1155.mode].filter(
    (value) => value !== "blocked"
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

async function main() {
  fs.mkdirSync(path.dirname(runtimeArtifactPath), { recursive: true });
  console.error(`[reef-runtime] using RPC ${rpcUrl}`);
  console.error(`[reef-runtime] deployer ${wallet.address}`);

  const existingRuntimeArtifact = readArtifactIfExists(runtimeArtifactPath);
  const official = await loadOfficialContracts();
  const fallback = {
    creatorFactory721: {
      address: existingRuntimeArtifact?.contracts?.fallback?.creatorFactory721?.address ?? "",
      verified: Boolean(existingRuntimeArtifact?.contracts?.fallback?.creatorFactory721?.verified)
    },
    editionFactory1155: {
      address: existingRuntimeArtifact?.contracts?.fallback?.editionFactory1155?.address ?? "",
      verified: Boolean(existingRuntimeArtifact?.contracts?.fallback?.editionFactory1155?.verified)
    },
    marketplace721: {
      address: existingRuntimeArtifact?.contracts?.fallback?.marketplace721?.address ?? "",
      verified: Boolean(existingRuntimeArtifact?.contracts?.fallback?.marketplace721?.verified)
    },
    marketplace1155: {
      address: existingRuntimeArtifact?.contracts?.fallback?.marketplace1155?.address ?? "",
      verified: Boolean(existingRuntimeArtifact?.contracts?.fallback?.marketplace1155?.verified)
    },
    dropManager: {
      address: existingRuntimeArtifact?.contracts?.fallback?.dropManager?.address ?? "",
      verified: Boolean(existingRuntimeArtifact?.contracts?.fallback?.dropManager?.verified)
    }
  };
  const deployErrors = [];
  let probe = existingRuntimeArtifact?.probe?.verified
    ? existingRuntimeArtifact.probe
    : {
        verified: false,
        reason: "Probe not executed."
      };

  try {
    const probeDeployment = await deployArtifact(
      "ReefDeploymentProbe",
      [],
      resolveConfiguredGasLimit("REEF_PROBE_GAS_LIMIT", "REEF_GAS_LIMIT") ?? 3_500_000n
    );
    probe = {
      verified: true,
      address: probeDeployment.address,
      txHash: probeDeployment.txHash,
      blockNumber: probeDeployment.blockNumber ?? null,
      reason: "Reef returned bytecode for the deployment probe."
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (!probe?.verified) {
      probe = {
        verified: false,
        reason
      };
    }
    deployErrors.push({
      contract: "ReefDeploymentProbe",
      reason
    });
  }

  for (const [key, contractName] of [
    ["creatorFactory721", "ReefCollectionFactory721"],
    ["editionFactory1155", "ReefEditionFactory"],
    ["marketplace721", "ReefMarketplace721"],
    ["marketplace1155", "ReefMarketplace1155"],
    ["dropManager", "ReefDropManager"]
  ]) {
    try {
      const deployment = await deployArtifact(
        contractName,
        [],
        key.startsWith("marketplace")
          ? resolveConfiguredGasLimit("REEF_MARKETPLACE_GAS_LIMIT", "REEF_GAS_LIMIT")
          : key === "dropManager"
            ? resolveConfiguredGasLimit("REEF_DROP_MANAGER_GAS_LIMIT", "REEF_GAS_LIMIT")
            : resolveConfiguredGasLimit("REEF_COLLECTION_GAS_LIMIT", "REEF_GAS_LIMIT")
      );
      fallback[key] = {
        address: deployment.address,
        verified: deployment.verified,
        deploymentTxHash: deployment.txHash,
        blockNumber: deployment.blockNumber
      };
    } catch (error) {
      deployErrors.push({
        contract: contractName,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const creator721 = official.creatorFactory.verified && official.seaDrop.verified
    ? {
        enabled: true,
        mode: "official",
        factoryAddress: official.creatorFactory.address,
        implementationAddress: official.collectionImplementation.address,
        marketplaceMode: official.seaport.verified ? "official" : fallback.marketplace721.verified ? "fallback" : "blocked",
        reason: official.seaport.verified ? "" : "Seaport is unavailable; trading will fall back when possible."
      }
    : fallback.creatorFactory721.verified
      ? {
          enabled: true,
          mode: "fallback",
          factoryAddress: fallback.creatorFactory721.address,
          implementationAddress: "",
          marketplaceMode: fallback.marketplace721.verified ? "fallback" : "blocked",
          reason: fallback.marketplace721.verified ? "" : "Fallback ERC721 marketplace is unavailable."
        }
      : {
          enabled: false,
          mode: "blocked",
          factoryAddress: "",
          implementationAddress: "",
          marketplaceMode: "blocked",
          reason: "No verified ERC721 creator factory is available on Reef."
        };

  const creator1155 = fallback.editionFactory1155.verified
    ? {
        enabled: true,
        mode: "fallback",
        factoryAddress: fallback.editionFactory1155.address,
        implementationAddress: "",
        marketplaceMode: fallback.marketplace1155.verified ? "fallback" : "blocked",
        reason: fallback.marketplace1155.verified ? "" : "Fallback ERC1155 marketplace is unavailable."
      }
    : {
        enabled: false,
        mode: "blocked",
        factoryAddress: "",
        implementationAddress: "",
        marketplaceMode: "blocked",
        reason: "No verified ERC1155 edition factory is available on Reef."
      };

  const market721 = official.seaport.verified
    ? {
        enabled: true,
        mode: "official",
        address: official.seaport.address,
        reason: ""
      }
    : fallback.marketplace721.verified
      ? {
          enabled: true,
          mode: "fallback",
          address: fallback.marketplace721.address,
          reason: ""
        }
      : {
          enabled: false,
          mode: "blocked",
          address: "",
          reason: "No verified ERC721 marketplace is available on Reef."
        };

  const market1155 = fallback.marketplace1155.verified
    ? {
        enabled: true,
        mode: "fallback",
        address: fallback.marketplace1155.address,
        reason: ""
      }
    : {
        enabled: false,
        mode: "blocked",
        address: "",
        reason: "No verified ERC1155 marketplace is available on Reef."
      };

  const payload = {
    chainId,
    chainName,
    rpcUrl,
    deployer: wallet.address,
    generatedAt: new Date().toISOString(),
    probe,
    contracts: {
      official,
      fallback
    },
    deployment: {
      mode: deriveMode(creator721, creator1155, market721, market1155),
      creator: {
        erc721: creator721,
        erc1155: creator1155
      },
      marketplace: {
        erc721: market721,
        erc1155: market1155
      }
    },
    errors: deployErrors
  };

  fs.writeFileSync(runtimeArtifactPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

await main();
