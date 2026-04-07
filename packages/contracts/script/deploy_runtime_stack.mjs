import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import dotenv from "dotenv";
import { AbiCoder, JsonRpcProvider, Wallet } from "ethers";
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
const gasPrice = BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000");
const defaultGasLimit = BigInt(process.env.REEF_GAS_LIMIT ?? "80000000000");

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const outDir = path.join(rootDir, "packages/contracts/out");
const reviveBinaryPath = path.join(rootDir, "tools/revive-deployer/target/debug/revive-deployer");
const reviveManifestPath = path.join(rootDir, "tools/revive-deployer/Cargo.toml");
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

function ensureReviveDeployerBuilt() {
  if (fs.existsSync(reviveBinaryPath)) {
    return;
  }
  execFileSync("cargo", ["build", "--manifest-path", reviveManifestPath], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });
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

async function deployArtifact(contractName, args = [], gasLimit = defaultGasLimit) {
  const artifact = findArtifact(contractName);
  const encodedArgs = args.length
    ? AbiCoder.defaultAbiCoder().encode(
        args.map((arg) => arg.type),
        args.map((arg) => arg.value)
      )
    : "0x";
  const initCode = artifact.bytecode.object + encodedArgs.slice(2);
  ensureReviveDeployerBuilt();
  const stdout = execFileSync(reviveBinaryPath, {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PRIVATE_KEY: privateKey,
      REEF_RPC_URL: rpcUrl,
      INIT_CODE_HEX: initCode,
      REEF_GAS_LIMIT: gasLimit.toString(),
      REEF_GAS_PRICE_WEI: gasPrice.toString()
    }
  });
  const deployment = JSON.parse(stdout);
  const address = deployment.contract_address;
  const verified = Boolean(deployment.ok) && (await ensureCode(address));
  if (!verified) {
    throw new Error(`${contractName} deployed but no bytecode was found at ${address}.`);
  }
  return {
    address,
    verified,
    txHash: deployment.tx_hash,
    blockNumber: Number(deployment.block_number ?? 0),
    gasEstimated: deployment.gas_estimated,
    gasUsed: deployment.gas_used
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

  const official = await loadOfficialContracts();
  const fallback = {
    creatorFactory721: { address: "", verified: false },
    editionFactory1155: { address: "", verified: false },
    marketplace721: { address: "", verified: false },
    marketplace1155: { address: "", verified: false }
  };
  const deployErrors = [];
  let probe = {
    verified: false,
    reason: "Probe not executed."
  };

  try {
    const probeDeployment = await deployArtifact(
      "ReefDeploymentProbe",
      [],
      BigInt(process.env.REEF_PROBE_GAS_LIMIT ?? "3500000")
    );
    probe = {
      verified: true,
      address: probeDeployment.address,
      txHash: probeDeployment.txHash,
      blockNumber: probeDeployment.blockNumber ?? null,
      reason: "Reef returned bytecode for the deployment probe."
    };
  } catch (error) {
    probe = {
      verified: false,
      reason: error instanceof Error ? error.message : String(error)
    };
    deployErrors.push({
      contract: "ReefDeploymentProbe",
      reason: probe.reason
    });
  }

  for (const [key, contractName] of [
    ["creatorFactory721", "ReefCollectionFactory721"],
    ["editionFactory1155", "ReefEditionFactory"],
    ["marketplace721", "ReefMarketplace721"],
    ["marketplace1155", "ReefMarketplace1155"]
  ]) {
    try {
      const deployment = await deployArtifact(contractName);
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
