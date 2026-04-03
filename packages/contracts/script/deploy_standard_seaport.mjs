import fs from "node:fs";
import path from "node:path";

import { resolveNodeAppConfig } from "@reef/config";
import { JsonRpcProvider, Wallet, zeroPadValue } from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const rpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);

const vendorPath = path.join(rootDir, "packages/contracts/src/vendor/SeaportDeployer.sol");
const outputPath = path.join(
  rootDir,
  "packages/contracts/deployments",
  `reef-bootstrap-${chainId}.json`
);

const vendorSource = fs.readFileSync(vendorPath, "utf8");

function extractHexLiteral(functionName) {
  const matcher = new RegExp(
    `function ${functionName}\\(\\) internal pure returns \\(bytes memory\\) \\{\\s*return hex"([0-9a-fA-F]+)"`,
    "s"
  ).exec(vendorSource);

  if (!matcher) {
    throw new Error(`Could not find ${functionName} in SeaportDeployer.sol`);
  }

  return `0x${matcher[1]}`;
}

function decodeInitCode(callData) {
  return `0x${callData.slice(74)}`;
}

async function ensureCode(address, label) {
  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(
      `${label} deployment returned ${address}, but eth_getCode is still empty on the Reef RPC.`
    );
  }
}

async function deployContract(initCode) {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 100000000n;
  const gasLimit = await provider.estimateGas({
    from: wallet.address,
    data: initCode
  });

  const transaction = await wallet.sendTransaction({
    type: 0,
    data: initCode,
    gasPrice,
    gasLimit: (gasLimit * 120n) / 100n
  });

  const receipt = await transaction.wait();
  if (!receipt?.contractAddress || receipt.status !== 1) {
    throw new Error("Deployment did not return a contract address");
  }

  return {
    address: receipt.contractAddress,
    transactionHash: transaction.hash
  };
}

const conduitCallData = extractHexLiteral("conduitControllerDeploymentCall");
const seaportCallData = extractHexLiteral("seaportOnePointSixDeploymentCall");

const conduitInitCode = decodeInitCode(conduitCallData);
const canonicalSeaportInitCode = decodeInitCode(seaportCallData);

const conduitDeployment = await deployContract(conduitInitCode);
await ensureCode(conduitDeployment.address, "ConduitController");

const seaportInitCode = `0x${canonicalSeaportInitCode.slice(2, -64)}${zeroPadValue(
  conduitDeployment.address,
  32
).slice(2)}`;
const seaportDeployment = await deployContract(seaportInitCode);
await ensureCode(seaportDeployment.address, "Seaport");

const payload = {
  chainId,
  chainName: appConfig.network.chainName,
  rpcUrl,
  deployer: wallet.address,
  conduitController: conduitDeployment.address,
  seaport: seaportDeployment.address,
  seaDrop: appConfig.contracts.seaDrop.address,
  conduitControllerDeploymentTx: conduitDeployment.transactionHash,
  seaportDeploymentTx: seaportDeployment.transactionHash,
  mode: "standard",
  verified: true
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
