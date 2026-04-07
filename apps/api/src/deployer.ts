import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { AbiCoder, JsonRpcProvider } from "ethers";

import { config, repoRoot } from "./config.js";

const outDir = path.join(repoRoot, "packages/contracts/out");
const reviveBinaryPath = path.join(repoRoot, "tools/revive-deployer/target/debug/revive-deployer");
const reviveManifestPath = path.join(repoRoot, "tools/revive-deployer/Cargo.toml");

function normalizeRpcUrl(rpcUrl: string) {
  return rpcUrl.includes("host.docker.internal")
    ? rpcUrl.replace("host.docker.internal", "127.0.0.1")
    : rpcUrl;
}

function readArtifact(contractName: string) {
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
        return JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
          bytecode: { object: string };
        };
      }
    }
  }

  throw new Error(`Artifact not found for ${contractName}. Run forge build first.`);
}

function ensureReviveDeployerBuilt() {
  if (fs.existsSync(reviveBinaryPath)) {
    return;
  }

  execFileSync("cargo", ["build", "--manifest-path", reviveManifestPath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });
}

async function ensureCode(address: string) {
  const provider = new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl));
  const code = await provider.getCode(address);
  return code !== "0x";
}

async function deployArtifact(input: {
  contractName: string;
  constructorTypes: string[];
  constructorValues: unknown[];
  gasLimit?: bigint;
}) {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is required for relayed fallback deployments.");
  }

  const artifact = readArtifact(input.contractName);
  const encodedArgs =
    input.constructorTypes.length > 0
      ? AbiCoder.defaultAbiCoder().encode(input.constructorTypes, input.constructorValues)
      : "0x";
  const initCode = artifact.bytecode.object + encodedArgs.slice(2);

  ensureReviveDeployerBuilt();

  const stdout = execFileSync(reviveBinaryPath, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PRIVATE_KEY: privateKey,
      REEF_RPC_URL: normalizeRpcUrl(config.rpcUrl),
      INIT_CODE_HEX: initCode,
      REEF_GAS_LIMIT: String(input.gasLimit ?? BigInt(process.env.REEF_GAS_LIMIT ?? "80000000000")),
      REEF_GAS_PRICE_WEI: String(BigInt(process.env.REEF_GAS_PRICE_WEI ?? "100000000"))
    }
  });

  const deployment = JSON.parse(stdout) as {
    ok: boolean;
    tx_hash: string;
    block_number: string;
    contract_address: string;
  };

  const verified = deployment.ok && (await ensureCode(deployment.contract_address));
  if (!verified) {
    throw new Error(
      `${input.contractName} deployed but Reef did not return bytecode for ${deployment.contract_address}.`
    );
  }

  return {
    address: deployment.contract_address.toLowerCase(),
    txHash: deployment.tx_hash,
    blockNumber: Number(deployment.block_number ?? 0),
    verified
  };
}

export async function deployCreatorCollection(input: {
  standard: "ERC721" | "ERC1155";
  name: string;
  symbol: string;
  contractUri: string;
  ownerAddress: string;
  royaltyBps: number;
}) {
  if (input.standard === "ERC1155") {
    return deployArtifact({
      contractName: "ReefOpenEdition1155",
      constructorTypes: ["string", "string", "string", "address", "address", "uint96"],
      constructorValues: [
        input.name,
        input.symbol,
        input.contractUri,
        input.ownerAddress,
        input.ownerAddress,
        input.royaltyBps
      ]
    });
  }

  return deployArtifact({
    contractName: "ReefCollection",
    constructorTypes: ["string", "string", "address", "string"],
    constructorValues: [input.name, input.symbol, input.ownerAddress, input.contractUri]
  });
}
