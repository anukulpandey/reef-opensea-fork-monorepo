import fs from "node:fs";
import path from "node:path";

import { resolveNodeAppConfig } from "@reef/config";
import { AbiCoder, JsonRpcProvider, Wallet, getCreateAddress } from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const rpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const chainName = process.env.REEF_CHAIN_NAME ?? appConfig.network.chainName;
const collectionName = process.env.COLLECTION_NAME ?? appConfig.contracts.collection.name;
const collectionSymbol = process.env.COLLECTION_SYMBOL ?? appConfig.contracts.collection.symbol;
const contractUri = process.env.COLLECTION_CONTRACT_URI ?? "";
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);

const artifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefCollection.sol/ReefCollection.json"
);
const vendorPath = path.join(rootDir, "packages/contracts/src/vendor/SeaportDeployer.sol");
const outputPath = path.join(rootDir, "packages/contracts/deployments", `reef-${chainId}.json`);

function readArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`ReefCollection artifact not found at ${artifactPath}. Run forge build first.`);
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

function resolveVendorAddress(functionName) {
  const vendorSource = fs.readFileSync(vendorPath, "utf8");
  const matcher = new RegExp(
    `function ${functionName}\\(\\) internal pure returns \\(address\\) \\{\\s*return address\\((0x[0-9a-fA-F]{40})\\);`,
    "s"
  ).exec(vendorSource);

  if (!matcher) {
    throw new Error(`Could not resolve ${functionName} from SeaportDeployer.sol`);
  }

  return matcher[1];
}

function resolveBootstrapAddress(envName, functionName) {
  const envValue = process.env[envName];
  return envValue && envValue.length > 0 ? envValue : resolveVendorAddress(functionName);
}

async function ensureCode(address, label) {
  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} has no code at ${address}.`);
  }
}

const artifact = readArtifact();
const seaport = resolveBootstrapAddress(
  "SEAPORT_ADDRESS",
  "seaportOnePointSixDeploymentAddress"
);
const conduitController = resolveBootstrapAddress(
  "CONDUIT_CONTROLLER_ADDRESS",
  "conduitControllerDeploymentAddress"
);

await ensureCode(seaport, "Seaport");
await ensureCode(conduitController, "ConduitController");

const encodedArgs = AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "address", "string"],
  [collectionName, collectionSymbol, wallet.address, contractUri]
);
const initCode = artifact.bytecode.object + encodedArgs.slice(2);

const gasPrice = BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000");
const gasLimit = BigInt(process.env.REEF_GAS_LIMIT ?? "3500000");
const nonce = await provider.getTransactionCount(wallet.address, "pending");
const predictedAddress = getCreateAddress({ from: wallet.address, nonce });

const transaction = await wallet.sendTransaction({
  type: 0,
  nonce,
  data: initCode,
  gasPrice,
  gasLimit
});

const receipt = await transaction.wait();
const collection = receipt?.contractAddress ?? predictedAddress;
await ensureCode(collection, "ReefCollection");

const payload = {
  chainId,
  chainName,
  rpcUrl,
  deployer: wallet.address,
  seaport,
  conduitController,
  collection,
  collectionName,
  collectionSymbol,
  contractUri,
  verified: true,
  bootstrapMode:
    process.env.SEAPORT_ADDRESS && process.env.CONDUIT_CONTROLLER_ADDRESS ? "standard" : "canonical",
  collectionDeploymentTx: transaction.hash,
  contracts: {
    seaport,
    conduitController,
    collection
  }
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
