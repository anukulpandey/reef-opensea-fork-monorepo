import fs from "node:fs";
import path from "node:path";

import {
  AbiCoder,
  Interface,
  JsonRpcProvider,
  Wallet,
  TransactionReceipt,
  getCreateAddress
} from "ethers";

import { config, repoRoot } from "./config.js";

const outDir = path.join(repoRoot, "packages/contracts/out");
const rpcRequestTimeoutMs = 4_000;
const deployProcessTimeoutMs = Number(process.env.REEF_DEPLOY_MAX_WAIT_SECS ?? "600") * 1_000;
const gasLimitHeadroomNumerator = 11n;
const gasLimitHeadroomDenominator = 10n;
const broadcastVisibilityTimeoutMs = 15_000;
const broadcastVisibilityPollMs = 1_500;
const minimumReefMaxFeePerGasWei = BigInt(
  process.env.REEF_MIN_MAX_FEE_PER_GAS_WEI ?? "1000000000"
);
const forceLegacyReefFees = process.env.REEF_FORCE_LEGACY_FEES?.trim() !== "0";

type ContractArtifact = {
  abi: Array<string | Record<string, unknown>>;
  bytecode: { object: string };
};

type ReefTransactionResult = {
  ok: boolean;
  tx_hash: string;
  block_number: string;
  contract_address: string;
};

type CreatorCollectionDeployment = {
  address: string;
  txHash: string;
  blockNumber: number;
  verified: true;
  factoryAddress: string;
  path: "factory" | "direct";
};

function formatExecError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const execError = error as Error & { stderr?: unknown };
  const stderr =
    typeof execError.stderr === "string"
      ? execError.stderr
      : "";
  return `${error.message}\n${stderr}`.trim();
}

function normalizeDeployError(error: unknown) {
  const detail = formatExecError(error);

  if (/failed to estimate gas/i.test(detail) && /execution reverted/i.test(detail)) {
    return new Error(
      "Reef rejected the relayed collection deployment. The live Reef runtime is currently reverting collection creation, so this environment cannot publish a new collection right now."
    );
  }

  if (/temporarily banned/i.test(detail)) {
    return new Error(
      "Reef temporarily banned the repeated raw transaction. The relayer retried with fresh gas prices, but the node is still rejecting collection deployment."
    );
  }

  if (/invalid transaction/i.test(detail)) {
    return new Error(
      "Reef rejected the relayed collection deployment as an invalid transaction."
    );
  }

  return error instanceof Error ? error : new Error(detail);
}

function shouldFallbackToDirectDeploy(error: unknown) {
  const detail = formatExecError(error);
  return (
    /fallback collection factory call/i.test(detail) ||
    /rejected the relayed collection deployment/i.test(detail) ||
    /failed to estimate gas/i.test(detail) ||
    /execution reverted/i.test(detail) ||
    /call_exception/i.test(detail) ||
    /action="estimateGas"/i.test(detail) ||
    /require\(false\)/i.test(detail)
  );
}

function normalizeRpcUrl(rpcUrl: string) {
  return rpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? rpcUrl.replace("host.docker.internal", "127.0.0.1")
    : rpcUrl;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rpcRequest<T>(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
  timeoutMs = rpcRequestTimeoutMs
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: 1
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`RPC returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: T;
      error?: { message?: string };
    };

    if (payload.error) {
      throw new Error(payload.error.message || `RPC call ${method} failed`);
    }

    return payload.result as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`RPC request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
        return JSON.parse(fs.readFileSync(fullPath, "utf8")) as ContractArtifact;
      }
    }
  }

  throw new Error(`Artifact not found for ${contractName}. Run forge build first.`);
}

async function ensureRpcAvailable(rpcUrl: string) {
  await rpcRequest<string>(rpcUrl, "eth_chainId");
}

async function resolveGasPriceWei(rpcUrl: string) {
  const configuredGasPrice = process.env.REEF_GAS_PRICE_WEI?.trim();
  if (configuredGasPrice) {
    return BigInt(configuredGasPrice);
  }

  try {
    const gasPrice = await rpcRequest<string>(rpcUrl, "eth_gasPrice");
    return BigInt(gasPrice);
  } catch {
    return 100_000_000n;
  }
}

function maxBigInt(left: bigint, right?: bigint) {
  if (right === undefined) {
    return left;
  }
  return left > right ? left : right;
}

function addGasHeadroom(gasLimit: bigint) {
  return (gasLimit * gasLimitHeadroomNumerator) / gasLimitHeadroomDenominator + 1n;
}

function receiptSummary(receipt: TransactionReceipt) {
  return JSON.stringify({
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    contractAddress: receipt.contractAddress,
    gasUsed: receipt.gasUsed.toString()
  });
}

async function resolveFeeOverrides(
  provider: JsonRpcProvider,
  rpcUrl: string,
  attempt: number
) {
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
  const resolvedGasPrice = feeData.gasPrice ?? (await resolveGasPriceWei(rpcUrl));
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

async function ensureCode(address: string) {
  const provider = new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl));
  const code = await provider.getCode(address);
  return code !== "0x";
}

async function ensureTransactionVisible(provider: JsonRpcProvider, txHash: string) {
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

async function readCollectionOwner(address: string) {
  const provider = new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl));
  const ownerInterface = new Interface([
    "function owner() view returns (address)"
  ]);
  const result = await provider.call({
    to: address,
    data: ownerInterface.encodeFunctionData("owner")
  });
  const [owner] = ownerInterface.decodeFunctionResult("owner", result);
  return String(owner).toLowerCase();
}

async function submitReefTransaction(input: {
  inputHex: string;
  txTo?: string;
  expectedCodeAddress?: string;
  gasLimit?: bigint;
}) {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is required for relayed fallback deployments.");
  }

  const rpcUrl = normalizeRpcUrl(config.rpcUrl);
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  try {
    await ensureRpcAvailable(rpcUrl);
  } catch {
    throw new Error(
      `Reef RPC is unreachable at ${rpcUrl}. Check the configured Reef RPC before deploying collections.`
    );
  }

  const configuredGasLimit =
    input.gasLimit ??
    (process.env.REEF_GAS_LIMIT?.trim()
      ? BigInt(process.env.REEF_GAS_LIMIT.trim())
      : undefined);
  const attemptCount = 3;
  let lastError: unknown = null;
  const txRequest = input.txTo
    ? { to: input.txTo, data: input.inputHex }
    : { data: input.inputHex };
  const relayedNonce = await provider.getTransactionCount(wallet.address, "pending");

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    try {
      const estimatedGas = await provider.estimateGas({
        from: wallet.address,
        ...txRequest
      });
      const gasLimit = maxBigInt(addGasHeadroom(estimatedGas), configuredGasLimit);
      const feeOverrides = await resolveFeeOverrides(provider, rpcUrl, attempt);
      const response = await wallet.sendTransaction({
        ...txRequest,
        nonce: relayedNonce,
        gasLimit,
        ...feeOverrides
      });
      await ensureTransactionVisible(provider, response.hash);
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
        ok: true,
        tx_hash: receipt.hash,
        block_number: String(receipt.blockNumber ?? 0),
        contract_address: (
          receipt.contractAddress ??
          input.expectedCodeAddress ??
          input.txTo ??
          ""
        ).toLowerCase()
      } as ReefTransactionResult;
    } catch (error) {
      const detail = formatExecError(error);
      if (
        attempt < attemptCount - 1 &&
        (
          /temporarily banned/i.test(detail) ||
          /priority is too low/i.test(detail) ||
          /never surfaced the transaction back/i.test(detail)
        )
      ) {
        lastError = error;
        continue;
      }
      lastError = error;
      break;
    }
  }

  if (/temporarily banned/i.test(formatExecError(lastError))) {
    throw normalizeDeployError(lastError);
  }

  throw normalizeDeployError(lastError);
}

async function deployArtifact(input: {
  contractName: string;
  constructorTypes: string[];
  constructorValues: unknown[];
  gasLimit?: bigint;
}) {
  const artifact = readArtifact(input.contractName);

  const encodedArgs =
    input.constructorTypes.length > 0
      ? AbiCoder.defaultAbiCoder().encode(input.constructorTypes, input.constructorValues)
      : "0x";
  const initCode = artifact.bytecode.object + encodedArgs.slice(2);

  const deployment = await submitReefTransaction({
    inputHex: initCode,
    gasLimit: input.gasLimit
  });

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

async function deployViaFactory(input: {
  standard: "ERC721" | "ERC1155";
  name: string;
  symbol: string;
  contractUri: string;
  ownerAddress: string;
  royaltyBps: number;
  factoryAddress: string;
}): Promise<CreatorCollectionDeployment> {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is required for relayed fallback deployments.");
  }

  const normalizedFactoryAddress = input.factoryAddress.trim();
  if (!normalizedFactoryAddress) {
    throw new Error(`No fallback factory is configured for ${input.standard}.`);
  }

  const provider = new JsonRpcProvider(normalizeRpcUrl(config.rpcUrl));
  const relayerAddress = new Wallet(privateKey).address.toLowerCase();
  const factoryArtifact = readArtifact(
    input.standard === "ERC1155" ? "ReefEditionFactory" : "ReefCollectionFactory721"
  );
  const factoryInterface = new Interface(factoryArtifact.abi);
  const factoryNonce = await provider.getTransactionCount(normalizedFactoryAddress, "latest");
  const predictedAddress = getCreateAddress({
    from: normalizedFactoryAddress,
    nonce: factoryNonce
  });
  const createData =
    input.standard === "ERC1155"
      ? factoryInterface.encodeFunctionData("createCollection", [
          input.name,
          input.symbol,
          input.contractUri,
          input.royaltyBps
        ])
      : factoryInterface.encodeFunctionData(
          "createCollection(string,string,string,uint96)",
          [
            input.name,
            input.symbol,
            input.contractUri,
            input.royaltyBps
          ]
        );

  const deployment = await submitReefTransaction({
    inputHex: createData,
    txTo: normalizedFactoryAddress,
    expectedCodeAddress: predictedAddress
  });

  if (!deployment.ok || !(await ensureCode(predictedAddress))) {
    throw new Error(
      `Fallback factory call completed but Reef did not return bytecode for ${predictedAddress}.`
    );
  }

  if (input.ownerAddress.toLowerCase() !== relayerAddress) {
    const transferInterface = new Interface([
      "function transferOwnership(address newOwner)"
    ]);
    await submitReefTransaction({
      inputHex: transferInterface.encodeFunctionData("transferOwnership", [input.ownerAddress]),
      txTo: predictedAddress
    });
  }

  const owner = await readCollectionOwner(predictedAddress);
  if (owner !== input.ownerAddress.toLowerCase()) {
    throw new Error(
      `Collection deployed at ${predictedAddress}, but ownership is still ${owner} instead of ${input.ownerAddress.toLowerCase()}.`
    );
  }

  return {
    address: predictedAddress.toLowerCase(),
    txHash: deployment.tx_hash,
    blockNumber: Number(deployment.block_number ?? 0),
    verified: true,
    factoryAddress: normalizedFactoryAddress.toLowerCase(),
    path: "factory"
  };
}

async function deployDirectCollection(input: {
  standard: "ERC721" | "ERC1155";
  name: string;
  symbol: string;
  contractUri: string;
  ownerAddress: string;
  royaltyBps: number;
}): Promise<CreatorCollectionDeployment> {
  const deployment =
    input.standard === "ERC1155"
      ? await deployArtifact({
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
        })
      : await deployArtifact({
          contractName: "ReefCollection",
          constructorTypes: ["string", "string", "address", "string", "address", "uint96"],
          constructorValues: [
            input.name,
            input.symbol,
            input.ownerAddress,
            input.contractUri,
            input.ownerAddress,
            input.royaltyBps
          ]
        });

  return {
    ...deployment,
    verified: true,
    factoryAddress: "",
    path: "direct"
  };
}

export async function deployCreatorCollection(input: {
  standard: "ERC721" | "ERC1155";
  name: string;
  symbol: string;
  contractUri: string;
  ownerAddress: string;
  royaltyBps: number;
  factoryAddress?: string;
}) {
  if (input.factoryAddress?.trim()) {
    try {
      return await deployViaFactory({
        ...input,
        factoryAddress: input.factoryAddress
      });
    } catch (error) {
      if (!shouldFallbackToDirectDeploy(error)) {
        throw error;
      }
    }
  }

  return deployDirectCollection(input);
}
