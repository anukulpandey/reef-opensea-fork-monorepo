import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import dotenv from "dotenv";
import { JsonRpcProvider, Wallet } from "ethers";

const require = createRequire(import.meta.url);

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const moduleRoot =
  process.env.REEF_POLKADOT_NODE_MODULES ||
  "/Users/anukul/Desktop/latest-reef-chain-upgrade/chain-upgrade/scripts/send_to_evm_local/node_modules";

const { ApiPromise, WsProvider, HttpProvider, Keyring } = require(path.join(
  moduleRoot,
  "@polkadot/api"
));
const { cryptoWaitReady, evmToAddress } = require(path.join(moduleRoot, "@polkadot/util-crypto"));

const privateKeyInput = String(process.env.PRIVATE_KEY || "").trim();
if (!privateKeyInput) {
  throw new Error("PRIVATE_KEY is required");
}

const privateKey = privateKeyInput.startsWith("0x") ? privateKeyInput : `0x${privateKeyInput}`;
const wsUrl = process.env.REEF_POLKADOT_WS_URL || "ws://127.0.0.1:9944";
const substrateHttpUrl = process.env.REEF_POLKADOT_HTTP_URL || "http://127.0.0.1:9944";
const useHttpProvider = String(process.env.REEF_POLKADOT_USE_HTTP || "").toLowerCase() === "true";
const configuredRpcUrl = process.env.REEF_RPC_URL || "http://127.0.0.1:8545";
const rpcUrl =
  configuredRpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? configuredRpcUrl.replace("host.docker.internal", "127.0.0.1")
    : configuredRpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID || "13939");
const gasLimit = Number(process.env.REEF_SUBSTRATE_GAS_LIMIT || "21000000");
const storageLimit = Number(process.env.REEF_SUBSTRATE_STORAGE_LIMIT || "5000000");

const artifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefDeploymentProbe.sol/ReefDeploymentProbe.json"
);

function decodeDispatchError(api, dispatchError) {
  if (dispatchError?.isModule) {
    const decoded = api.registry.findMetaError(dispatchError.asModule);
    return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
  }
  return dispatchError?.toString ? dispatchError.toString() : String(dispatchError);
}

async function nextNonce(api, substrateAddress) {
  return Number((await api.query.system.account(substrateAddress)).nonce.toString());
}

async function signAndWait(api, tx, signer, nonce) {
  const provider = api?._rpcCore?.provider;
  const supportsSubscriptions = Boolean(provider?.hasSubscriptions);

  if (!supportsSubscriptions) {
    const signedTx = await tx.signAsync(signer, { nonce });
    const txHash = signedTx.hash.toHex();
    await api.rpc.author.submitExtrinsic(signedTx);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const finalizedHead = await api.rpc.chain.getFinalizedHead();
      const signedBlock = await api.rpc.chain.getBlock(finalizedHead);
      const extrinsics = signedBlock.block.extrinsics;
      const matchedIndex = extrinsics.findIndex((extrinsic) => extrinsic.hash.toHex() === txHash);

      if (matchedIndex >= 0) {
        const systemEvents = await api.query.system.events.at(finalizedHead);
        const matchedEvents = systemEvents
          .filter(({ phase }) => phase.isApplyExtrinsic && Number(phase.asApplyExtrinsic) === matchedIndex)
          .map(({ event }) => ({
            section: event.section,
            method: event.method,
            data: event.data.toJSON()
          }));
        const failedEvent = systemEvents.find(
          ({ phase, event }) =>
            phase.isApplyExtrinsic &&
            Number(phase.asApplyExtrinsic) === matchedIndex &&
            event.section === "system" &&
            event.method === "ExtrinsicFailed"
        );

        if (failedEvent) {
          const [dispatchError] = failedEvent.event.data;
          throw new Error(decodeDispatchError(api, dispatchError));
        }

        return {
          txHash,
          finalizedBlock: finalizedHead.toHex(),
          events: matchedEvents
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Timed out waiting for extrinsic ${txHash} to finalize`);
  }

  return new Promise(async (resolve, reject) => {
    let unsubscribe = null;

    try {
      unsubscribe = await tx.signAndSend(
        signer,
        { nonce },
        ({ status, dispatchError, txHash, events }) => {
          if (dispatchError) {
            const message = decodeDispatchError(api, dispatchError);
            if (unsubscribe) {
              unsubscribe();
            }
            reject(new Error(message));
            return;
          }

          if (status.isFinalized) {
            if (unsubscribe) {
              unsubscribe();
            }
            const normalizedEvents = events.map(({ event }) => ({
              section: event.section,
              method: event.method,
              data: event.data.toJSON()
            }));
            resolve({
              txHash: txHash.toHex(),
              finalizedBlock: status.asFinalized.toHex(),
              events: normalizedEvents
            });
          }
        }
      );
    } catch (error) {
      if (unsubscribe) {
        unsubscribe();
      }
      reject(error);
    }
  });
}

function findCreatedAddress(events) {
  const createdEvent = events.find((event) => event.section === "evm" && event.method === "Created");
  if (!createdEvent) {
    return "";
  }

  const [, address] = createdEvent.data ?? [];
  return typeof address === "string" ? address : "";
}

async function ensureContractDevelopmentEnabled(api, signer, substrateAddress) {
  if (!api.tx?.evm?.enableContractDevelopment) {
    return { available: false };
  }

  try {
    const nonce = await nextNonce(api, substrateAddress);
    const result = await signAndWait(api, api.tx.evm.enableContractDevelopment(), signer, nonce);
    return { available: true, ok: true, alreadyEnabled: false, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ContractDevelopmentAlreadyEnabled")) {
      return { available: true, ok: true, alreadyEnabled: true };
    }
    throw error;
  }
}

async function main() {
  await cryptoWaitReady();

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const initCodeHex = artifact.bytecode?.object;
  if (!initCodeHex || initCodeHex === "0x") {
    throw new Error("ReefDeploymentProbe artifact has no bytecode");
  }

  const initCode = Buffer.from(initCodeHex.replace(/^0x/, ""), "hex");
  const wallet = new Wallet(privateKey);
  const provider = new JsonRpcProvider(rpcUrl, chainId);

  const api = useHttpProvider
    ? await ApiPromise.create({ provider: new HttpProvider(substrateHttpUrl) })
    : await ApiPromise.create({ provider: new WsProvider(wsUrl) });
  const keyring = new Keyring({ type: "ethereum" });
  const signer = keyring.addFromUri(privateKey);
  const substrateAddress = evmToAddress(wallet.address);

  const enableResult = await ensureContractDevelopmentEnabled(api, signer, substrateAddress);

  if (!api.tx?.evm?.create) {
    throw new Error("evm.create extrinsic is not available on this chain");
  }

  const createNonce = await nextNonce(api, substrateAddress);
  const createResult = await signAndWait(
    api,
    api.tx.evm.create(initCode, 0, gasLimit, storageLimit),
    signer,
    createNonce
  );
  const contractAddress = findCreatedAddress(createResult.events);

  if (!contractAddress) {
    throw new Error(`No evm.Created event was emitted: ${JSON.stringify(createResult.events)}`);
  }

  let deployResult = null;
  if (api.tx?.evm?.deploy) {
    const deployNonce = await nextNonce(api, substrateAddress);
    deployResult = await signAndWait(api, api.tx.evm.deploy(contractAddress), signer, deployNonce);
  }

  const code = await provider.getCode(contractAddress);
  let version = null;
  if (code !== "0x") {
    try {
      const iface = ["function version() view returns (string)"];
      const contract = new (await import("ethers")).Contract(contractAddress, iface, provider);
      version = await contract.version();
    } catch {
      version = null;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: code !== "0x",
        wsUrl,
        substrateHttpUrl,
        rpcUrl,
        evmAddress: wallet.address,
        substrateAddress,
        gasLimit,
        storageLimit,
        enableResult,
        createResult,
        deployResult,
        contractAddress,
        code,
        version
      },
      null,
      2
    )
  );

  await api.disconnect();
}

await main();
