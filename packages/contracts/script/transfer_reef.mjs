import path from "node:path";

import dotenv from "dotenv";
import { JsonRpcProvider, Wallet } from "ethers";
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
const privateKey = process.env.PRIVATE_KEY?.trim();
const to = process.env.TO_ADDRESS?.trim();
const value = BigInt(process.env.TRANSFER_WEI ?? "0");
const gasLimit = BigInt(process.env.TRANSFER_GAS_LIMIT ?? "21000");
const transferTxType = String(process.env.TRANSFER_TX_TYPE ?? "eip1559").toLowerCase();
const gasPrice = BigInt(process.env.TRANSFER_GAS_PRICE_WEI ?? "120000000000");
const maxPriorityFeePerGas = BigInt(
  process.env.TRANSFER_MAX_PRIORITY_FEE_PER_GAS_WEI ?? "100000000000"
);
const maxFeePerGas = BigInt(process.env.TRANSFER_MAX_FEE_PER_GAS_WEI ?? "120000000000");

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

if (!to) {
  throw new Error("TO_ADDRESS is required");
}

if (value <= 0n) {
  throw new Error("TRANSFER_WEI must be greater than 0");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);

const transaction = await wallet.sendTransaction(
  transferTxType === "legacy"
    ? {
        to,
        value,
        gasLimit,
        gasPrice,
        type: 0
      }
    : {
        to,
        value,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas
      }
);

const receipt = await transaction.wait();

console.log(
  JSON.stringify(
    {
      rpcUrl,
      chainId,
      from: wallet.address,
      to,
      value: value.toString(),
      txHash: transaction.hash,
      blockNumber: receipt?.blockNumber ?? null,
      status: receipt?.status ?? null
    },
    null,
    2
  )
);
