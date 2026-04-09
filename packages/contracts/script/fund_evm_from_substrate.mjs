import path from "node:path";
import { createRequire } from "node:module";

import dotenv from "dotenv";

const require = createRequire(import.meta.url);

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const moduleRoot =
  process.env.REEF_POLKADOT_NODE_MODULES ||
  "/Users/anukul/Desktop/latest-reef-chain-upgrade/chain-upgrade/scripts/send_to_evm_local/node_modules";

const { ApiPromise, WsProvider, Keyring } = require(path.join(moduleRoot, "@polkadot/api"));
const { JsonRpcProvider } = await import("ethers");

const wsUrl = process.env.REEF_POLKADOT_WS_URL || "ws://127.0.0.1:9944";
const evmRpcUrl = process.env.REEF_RPC_URL || "http://127.0.0.1:8545";
const targetEvmAddress = process.env.TO_ADDRESS?.trim();
const amountInput = process.env.FUND_AMOUNT_REEF?.trim() || "0";
const seedUri = process.env.SUBSTRATE_SEED?.trim() || "//Alice";
const pollAttempts = Number(process.env.SUBSTRATE_POLL_ATTEMPTS ?? "60");
const pollIntervalMs = Number(process.env.SUBSTRATE_POLL_INTERVAL_MS ?? "1000");

if (!targetEvmAddress || !/^0x[0-9a-fA-F]{40}$/.test(targetEvmAddress)) {
  throw new Error("TO_ADDRESS must be a 20-byte EVM address");
}

if (!/^\d+(\.\d+)?$/.test(amountInput)) {
  throw new Error(`Invalid FUND_AMOUNT_REEF value: ${amountInput}`);
}

function parseUnits(value, decimals) {
  const [whole, fraction = ""] = String(value).split(".");
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places in ${value}`);
  }
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  );
}

function formatUnits(value, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) {
    return whole.toString();
  }
  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function fallbackAccountFromEvm(evmAddress) {
  const hex = evmAddress.replace(/^0x/, "").toLowerCase();
  return `0x${hex}${"ee".repeat(12)}`;
}

function decodeDispatchError(api, dispatchError) {
  if (dispatchError?.isModule) {
    const decoded = api.registry.findMetaError(dispatchError.asModule);
    return `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
  }
  return dispatchError?.toString ? dispatchError.toString() : String(dispatchError);
}

function describeReviveArgs(metaArgs) {
  return metaArgs
    .map((arg) => {
      const name = arg?.name || "<unnamed>";
      const type = arg?.type?.displayName || arg?.type?.type || arg?.type || "<unknown>";
      return `${name}:${type}`;
    })
    .join(", ");
}

function buildReviveTransfer(api, signerAddress, targetEvm, amountUnits) {
  const reviveTransfer = api.tx?.revive?.transfer;
  if (!reviveTransfer) {
    return null;
  }

  const metaArgs = reviveTransfer.meta.toJSON().args || [];
  const names = metaArgs.map((arg) => String(arg?.name || "").toLowerCase());
  const types = metaArgs.map((arg) => JSON.stringify(arg?.type || "").toLowerCase());
  const haystack = `${names.join(",")}|${types.join(",")}`;

  if (metaArgs.length === 2 && haystack.includes("h160")) {
    return {
      label: `revive.transfer(${describeReviveArgs(metaArgs)})`,
      tx: reviveTransfer(targetEvm, amountUnits)
    };
  }

  if (metaArgs.length === 3 && haystack.includes("accountid") && haystack.includes("h160")) {
    return {
      label: `revive.transfer(${describeReviveArgs(metaArgs)})`,
      tx: reviveTransfer(signerAddress, targetEvm, amountUnits)
    };
  }

  return {
    label: `revive.transfer(${describeReviveArgs(metaArgs)})`,
    tx: reviveTransfer(targetEvm, amountUnits)
  };
}

async function submitAndPoll(api, tx, signer) {
  const signedTx = await tx.signAsync(signer);
  const txHash = signedTx.hash.toHex();
  await api.rpc.author.submitExtrinsic(signedTx);

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const finalizedHead = await api.rpc.chain.getFinalizedHead();
    const signedBlock = await api.rpc.chain.getBlock(finalizedHead);
    const extrinsics = signedBlock.block.extrinsics;
    const matchedIndex = extrinsics.findIndex((extrinsic) => extrinsic.hash.toHex() === txHash);

    if (matchedIndex >= 0) {
      const systemEvents = await api.query.system.events.at(finalizedHead);
      const scopedEvents = systemEvents
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
        events: scopedEvents
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for extrinsic ${txHash} to finalize`);
}

async function main() {
  const api = await ApiPromise.create({ provider: new WsProvider(wsUrl) });
  const provider = new JsonRpcProvider(evmRpcUrl);
  const keyring = new Keyring({ type: "sr25519" });
  const signer = keyring.addFromUri(seedUri);

  const nativeDecimals = api.registry.chainDecimals[0] || 12;
  const amountUnits = parseUnits(amountInput, nativeDecimals);
  const fallbackAccount = fallbackAccountFromEvm(targetEvmAddress);
  const nativeBefore = (await api.query.system.account(signer.address)).data.free.toBigInt();
  const evmBefore = await provider.getBalance(targetEvmAddress);

  const reviveTransfer = buildReviveTransfer(api, signer.address, targetEvmAddress, amountUnits);
  const submission = reviveTransfer
    ? await submitAndPoll(api, reviveTransfer.tx, signer)
    : await submitAndPoll(
        api,
        api.tx.balances.transferAllowDeath(fallbackAccount, amountUnits),
        signer
      );

  const nativeAfter = (await api.query.system.account(signer.address)).data.free.toBigInt();
  const evmAfter = await provider.getBalance(targetEvmAddress);

  console.log(
    JSON.stringify(
      {
        ok: evmAfter > evmBefore,
        wsUrl,
        evmRpcUrl,
        signerAddress: signer.address,
        targetEvmAddress,
        fallbackAccount,
        amountReef: amountInput,
        amountUnits: amountUnits.toString(),
        strategy: reviveTransfer?.label ?? "balances.transferAllowDeath",
        submission,
        nativeBefore: formatUnits(nativeBefore, nativeDecimals),
        nativeAfter: formatUnits(nativeAfter, nativeDecimals),
        evmBefore: evmBefore.toString(),
        evmAfter: evmAfter.toString()
      },
      null,
      2
    )
  );

  await api.disconnect();
}

await main();
