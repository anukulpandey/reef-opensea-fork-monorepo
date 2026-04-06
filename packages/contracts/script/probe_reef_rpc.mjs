import fs from "node:fs";
import path from "node:path";

import { resolveNodeAppConfig } from "@reef/config";
import dotenv from "dotenv";
import { JsonRpcProvider, Wallet, getCreateAddress } from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const rpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const artifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefDeploymentProbe.sol/ReefDeploymentProbe.json"
);
const outputPath = path.join(
  rootDir,
  "packages/contracts/deployments",
  `reef-probe-${chainId}.json`
);

function readArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Probe artifact not found at ${artifactPath}. Run forge build first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function main() {
  try {
    const artifact = readArtifact();
    const gasPrice = BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000");
    const gasLimit = BigInt(process.env.REEF_GAS_LIMIT ?? "2000000");
    const nonce = await provider.getTransactionCount(wallet.address, "pending");
    const predictedAddress = getCreateAddress({ from: wallet.address, nonce });

    const transaction = await wallet.sendTransaction({
      type: 0,
      nonce,
      data: artifact.bytecode.object,
      gasPrice,
      gasLimit
    });

    const receipt = await transaction.wait();
    const probeAddress = receipt?.contractAddress ?? predictedAddress;
    const code = await provider.getCode(probeAddress);
    const verified = code !== "0x";

    const payload = {
      chainId,
      rpcUrl,
      deployer: wallet.address,
      probeAddress,
      verified,
      txHash: transaction.hash,
      blockNumber: receipt?.blockNumber ?? null,
      note: verified
        ? "Probe contract returned bytecode successfully."
        : "Probe transaction mined, but eth_getCode returned 0x for the resulting address."
    };

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
    console.log(JSON.stringify(payload, null, 2));

    if (!verified) {
      throw new Error(
        `Deployment probe failed: ${probeAddress} returned empty bytecode on ${rpcUrl}.`
      );
    }
  } catch (error) {
    const payload = {
      chainId,
      rpcUrl,
      deployer: wallet.address,
      verified: false,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
    console.error(JSON.stringify(payload, null, 2));
    throw error;
  }
}

await main();
