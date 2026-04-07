import path from "node:path";
import { createRequire } from "node:module";

import { Wallet } from "ethers";

const require = createRequire(import.meta.url);

const moduleRoot =
  process.env.REEF_POLKADOT_NODE_MODULES ||
  "/Users/anukul/Desktop/latest-reef-chain-upgrade/chain-upgrade/scripts/send_to_evm_local/node_modules";

const { ApiPromise, WsProvider, Keyring } = require(path.join(moduleRoot, "@polkadot/api"));
const { cryptoWaitReady, evmToAddress } = require(path.join(moduleRoot, "@polkadot/util-crypto"));

const wsUrl = process.env.REEF_POLKADOT_WS_URL || "ws://127.0.0.1:9944";
const privateKeyInput = String(process.env.PRIVATE_KEY || "").trim();

if (!privateKeyInput) {
  throw new Error("PRIVATE_KEY is required");
}

const privateKey = privateKeyInput.startsWith("0x")
  ? privateKeyInput
  : `0x${privateKeyInput}`;

const wallet = new Wallet(privateKey);

function decodeDispatchError(api, dispatchError) {
  if (dispatchError?.isModule) {
    const decoded = api.registry.findMetaError(dispatchError.asModule);
    return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
  }

  return dispatchError?.toString ? dispatchError.toString() : String(dispatchError);
}

async function signAndWait(api, tx, signer, nonce) {
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
            const finalizedBlock = status.asFinalized.toHex();
            if (unsubscribe) {
              unsubscribe();
            }
            resolve({
              txHash: txHash.toHex(),
              finalizedBlock,
              eventCount: events.length
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

async function main() {
  await cryptoWaitReady();

  const provider = new WsProvider(wsUrl);
  const api = await ApiPromise.create({ provider });
  const keyring = new Keyring({ type: "ethereum" });
  const signer = keyring.addFromUri(privateKey);
  const substrateAddress = evmToAddress(wallet.address);

  const chainName = (await api.rpc.system.chain()).toString();
  const signerAddress = signer.address.toString();
  const nonce = Number((await api.query.system.account(substrateAddress)).nonce.toString());

  if (!api.tx?.evm?.enableContractDevelopment) {
    throw new Error("evm.enableContractDevelopment extrinsic is not available on this chain");
  }

  console.log(
    JSON.stringify(
      {
        chainName,
        wsUrl,
        evmAddress: wallet.address,
        signerAddress,
        substrateAddress,
        nonce
      },
      null,
      2
    )
  );

  try {
    const result = await signAndWait(api, api.tx.evm.enableContractDevelopment(), signer, nonce);
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: "enable_contract_development",
          evmAddress: wallet.address,
          signerAddress,
          substrateAddress,
          ...result
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ContractDevelopmentAlreadyEnabled")) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            action: "enable_contract_development",
            evmAddress: wallet.address,
            signerAddress,
            substrateAddress,
            alreadyEnabled: true
          },
          null,
          2
        )
      );
    } else {
      throw error;
    }
  } finally {
    await api.disconnect();
  }
}

await main();
