import fs from "node:fs";
import path from "node:path";

import { resolveNodeAppConfig } from "@reef/config";
import dotenv from "dotenv";
import { AbiCoder, JsonRpcProvider, Wallet, getCreateAddress } from "ethers";

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
const collectionSlug = process.env.COLLECTION_SLUG ?? appConfig.contracts.collection.slug;
const collectionName = process.env.COLLECTION_NAME ?? appConfig.contracts.collection.name;
const collectionSymbol = process.env.COLLECTION_SYMBOL ?? appConfig.contracts.collection.symbol;
const contractUri = process.env.COLLECTION_CONTRACT_URI ?? "";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const collectionArtifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefCollection.sol/ReefCollection.json"
);
const marketplaceArtifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefMarketplace.sol/ReefMarketplace.json"
);
const outputPath = path.join(rootDir, "packages/contracts/deployments", `reef-${chainId}.json`);

function readArtifact(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} artifact not found at ${filePath}. Run forge build first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function ensureCode(address, label) {
  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} has no code at ${address}.`);
  }
}

async function deployContract(bytecode, args, label, gasLimit) {
  const encodedArgs = args.length
    ? AbiCoder.defaultAbiCoder().encode(args.map((arg) => arg.type), args.map((arg) => arg.value))
    : "0x";
  const initCode = bytecode + encodedArgs.slice(2);
  const gasPrice = BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000");
  const nonce = await provider.getTransactionCount(wallet.address, "pending");
  const predictedAddress = getCreateAddress({ from: wallet.address, nonce });

  const transaction = await wallet.sendTransaction({
    type: 0,
    chainId,
    nonce,
    data: initCode,
    gasPrice,
    gasLimit
  });

  const receipt = await transaction.wait();
  const address = receipt?.contractAddress ?? predictedAddress;
  await ensureCode(address, label);

  return {
    address,
    txHash: transaction.hash,
    blockNumber: receipt?.blockNumber ?? null
  };
}

async function main() {
  const collectionArtifact = readArtifact(collectionArtifactPath, "ReefCollection");
  const marketplaceArtifact = readArtifact(marketplaceArtifactPath, "ReefMarketplace");

  const collectionDeployment = await deployContract(
    collectionArtifact.bytecode.object,
    [
      { type: "string", value: collectionName },
      { type: "string", value: collectionSymbol },
      { type: "address", value: wallet.address },
      { type: "string", value: contractUri }
    ],
    "ReefCollection",
    BigInt(process.env.REEF_COLLECTION_GAS_LIMIT ?? "3500000")
  );

  const marketplaceDeployment = await deployContract(
    marketplaceArtifact.bytecode.object,
    [{ type: "address", value: collectionDeployment.address }],
    "ReefMarketplace",
    BigInt(process.env.REEF_MARKETPLACE_GAS_LIMIT ?? "2500000")
  );

  const payload = {
    chainId,
    chainName,
    rpcUrl,
    deployer: wallet.address,
    collectionSlug,
    collection: collectionDeployment.address,
    collectionName,
    collectionSymbol,
    collectionContractUri: contractUri,
    collectionVerified: true,
    collectionDeploymentTx: collectionDeployment.txHash,
    marketplace: marketplaceDeployment.address,
    marketplaceVerified: true,
    marketplaceDeploymentTx: marketplaceDeployment.txHash,
    verified: true,
    contracts: {
      collection: collectionDeployment.address,
      marketplace: marketplaceDeployment.address,
      seaport: appConfig.contracts.seaport.address,
      conduitController: appConfig.contracts.conduitController.address,
      seaDrop: appConfig.contracts.seaDrop.address
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

await main();
