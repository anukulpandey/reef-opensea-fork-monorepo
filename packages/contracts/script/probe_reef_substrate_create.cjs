#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const moduleRoot =
  process.env.REEF_POLKADOT_NODE_MODULES ||
  "/Users/anukul/Desktop/latest-reef-chain-upgrade/chain-upgrade/scripts/send_to_evm_local/node_modules";

const { ApiPromise, WsProvider, Keyring } = require(path.join(moduleRoot, "@polkadot/api"));

const rootDir = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const wsUrl = process.env.REEF_POLKADOT_WS_URL || "ws://127.0.0.1:9944";
const configuredRpcUrl = process.env.REEF_RPC_URL || "http://127.0.0.1:8545";
const rpcUrl =
  configuredRpcUrl.includes("host.docker.internal") && !process.env.RUNNING_IN_DOCKER
    ? configuredRpcUrl.replace("host.docker.internal", "127.0.0.1")
    : configuredRpcUrl;
const privateKeyInput = String(process.env.PRIVATE_KEY || "").trim();
if (!privateKeyInput) {
  throw new Error("PRIVATE_KEY is required");
}

const privateKey = privateKeyInput.startsWith("0x") ? privateKeyInput : `0x${privateKeyInput}`;
const gasLimit = Number(process.env.REEF_SUBSTRATE_GAS_LIMIT || "21000000");
const storageLimit = Number(process.env.REEF_SUBSTRATE_STORAGE_LIMIT || "5000000");
const chainId = Number(process.env.REEF_CHAIN_ID || "13939");
const artifactPath = path.join(
  rootDir,
  "packages/contracts/out/ReefDeploymentProbe.sol/ReefDeploymentProbe.json"
);

function fallbackAccountFromEvm(evmAddress) {
  const hex = evmAddress.replace(/^0x/, "").toLowerCase();
  return `0x${hex}${"ee".repeat(12)}`;
}

function decodeDispatchError(api, dispatchError) {
  if (dispatchError?.isModule) {
    const decoded = api.registry.findMetaError(dispatchError.asModule);
    return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
  }

  if (dispatchError?.toString) {
    return dispatchError.toString();
  }

  return String(dispatchError);
}

async function signAndWait(api, tx, signer, nonce) {
  return new Promise(async (resolve, reject) => {
    let unsubscribe = null;

    try {
      console.log(`Submitting ${tx.method.section}.${tx.method.method} with nonce ${nonce}...`);
      unsubscribe = await tx.signAndSend(
        signer,
        { nonce },
        ({ status, dispatchError, events, txHash }) => {
          if (status.isInBlock) {
            console.log(`${tx.method.section}.${tx.method.method} included in ${status.asInBlock.toHex()}`);
          }
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
            resolve({
              txHash: txHash.toHex(),
              finalizedBlock: status.asFinalized.toHex(),
              events: events.map(({ event }) => ({
                section: event.section,
                method: event.method,
                data: event.data.toJSON()
              }))
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

function findEvent(events, section, method) {
  return events.find((event) => event.section === section && event.method === method);
}

async function main() {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode?.object;
  if (!bytecode || bytecode === "0x") {
    throw new Error("Probe artifact bytecode is missing");
  }

  const { JsonRpcProvider, Wallet, Contract } = require("ethers");
  const wallet = new Wallet(privateKey);
  const provider = new JsonRpcProvider(rpcUrl, chainId);
  console.log(`Connecting to Reef WS at ${wsUrl}...`);
  const api = await ApiPromise.create({ provider: new WsProvider(wsUrl) });
  console.log(`Connected to Reef chain ${String(await api.rpc.system.chain())}`);
  const keyring = new Keyring({ type: "ethereum" });
  const signer = keyring.addFromUri(privateKey);
  const substrateAddress = fallbackAccountFromEvm(wallet.address);

  let nonce = Number((await api.query.system.account(substrateAddress)).nonce.toString());
  console.log(
    `Using EVM ${wallet.address}; signer ${signer.address}; fallback ${substrateAddress}; nonce ${nonce}`
  );

  let enableResult;
  try {
    enableResult = await signAndWait(api, api.tx.evm.enableContractDevelopment(), signer, nonce);
    nonce += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ContractDevelopmentAlreadyEnabled")) {
      enableResult = { ok: true, alreadyEnabled: true };
    } else {
      throw error;
    }
  }

  const createResult = await signAndWait(
    api,
    api.tx.evm.create(`0x${bytecode.replace(/^0x/, "")}`, 0, gasLimit, storageLimit),
    signer,
    nonce
  );
  nonce += 1;
  console.log(`Create finished with ${createResult.events.length} scoped events`);

  const created = findEvent(createResult.events, "evm", "Created");
  if (!created) {
    throw new Error(`No Created event emitted: ${JSON.stringify(createResult.events)}`);
  }

  const contractAddress = created.data[1];
  const deployResult = await signAndWait(api, api.tx.evm.deploy(contractAddress), signer, nonce);
  const code = await provider.getCode(contractAddress);

  let version = null;
  if (code !== "0x") {
    const contract = new Contract(contractAddress, ["function version() view returns (string)"], provider);
    try {
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
        rpcUrl,
        gasLimit,
        storageLimit,
        evmAddress: wallet.address,
        substrateAddress,
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
