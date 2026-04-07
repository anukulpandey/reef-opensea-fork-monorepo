import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { resolveNodeAppConfig } from "@reef/config";
import dotenv from "dotenv";
import { Wallet } from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
const appConfig = resolveNodeAppConfig({ cwd: rootDir });

const configuredRpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const rpcUrl =
  configuredRpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? configuredRpcUrl.replace("host.docker.internal", "127.0.0.1")
    : configuredRpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

const wallet = new Wallet(privateKey);
const artifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefDeploymentProbe.sol/ReefDeploymentProbe.json"
);
const outputPath = path.join(
  rootDir,
  "packages/contracts/deployments",
  `reef-probe-${chainId}.json`
);
const reviveBinaryPath = path.join(rootDir, "tools/revive-deployer/target/debug/revive-deployer");
const reviveManifestPath = path.join(rootDir, "tools/revive-deployer/Cargo.toml");

function readArtifact() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Probe artifact not found at ${artifactPath}. Run forge build first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
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

function deployWithRevive() {
  ensureReviveDeployerBuilt();
  const stdout = execFileSync(reviveBinaryPath, {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PRIVATE_KEY: privateKey,
      REEF_RPC_URL: rpcUrl,
      ARTIFACT_JSON_PATH: artifactPath
    }
  });
  return JSON.parse(stdout);
}

async function main() {
  try {
    readArtifact();
    const deployment = deployWithRevive();
    const probeAddress = deployment.contract_address;
    const verified = Boolean(deployment.ok);

    const payload = {
      chainId,
      rpcUrl,
      deployer: wallet.address,
      probeAddress,
      verified,
      txHash: deployment.tx_hash,
      blockNumber: Number(deployment.block_number ?? 0),
      gasEstimated: deployment.gas_estimated,
      gasUsed: deployment.gas_used,
      codeLength: deployment.code_len,
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
