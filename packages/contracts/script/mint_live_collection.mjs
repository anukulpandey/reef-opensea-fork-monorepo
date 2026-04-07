import fs from "node:fs";
import path from "node:path";

import { resolveNodeAppConfig } from "@reef/config";
import dotenv from "dotenv";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
const appConfig = resolveNodeAppConfig({ cwd: rootDir });
const rpcUrl = process.env.REEF_RPC_URL ?? appConfig.network.rpcUrl;
const chainId = Number(process.env.REEF_CHAIN_ID ?? String(appConfig.network.chainId));
const privateKey = process.env.PRIVATE_KEY;
const ipfsApiUrl = process.env.IPFS_API_URL ?? appConfig.services.ipfsApiUrl;
const manifestPath = path.resolve(
  rootDir,
  process.env.MINT_MANIFEST_PATH ?? "packages/contracts/seed/live-collection.json"
);
const deploymentPath = path.resolve(
  rootDir,
  process.env.REEF_DEPLOYMENT_FILE ?? appConfig.contracts.artifactPaths.deployment
);

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Mint manifest not found at ${manifestPath}`);
}

if (!fs.existsSync(deploymentPath)) {
  throw new Error(`Deployment artifact not found at ${deploymentPath}`);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
if (!deployment.collection) {
  throw new Error("Deployment artifact does not include a collection address.");
}

const provider = new JsonRpcProvider(rpcUrl, chainId);
const wallet = new Wallet(privateKey, provider);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const collection = new Contract(
  deployment.collection,
  [
    "function mintCreator(address to, string tokenUri) external returns (uint256)",
    "function owner() view returns (address)"
  ],
  wallet
);

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function buildSvg(item) {
  const accent = item.accent ?? "#2081e2";
  const accentSoft = item.accentSoft ?? "#0f172a";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" fill="none">
  <rect width="1200" height="1200" fill="#111315"/>
  <rect x="64" y="64" width="1072" height="1072" rx="48" fill="${accentSoft}"/>
  <circle cx="930" cy="260" r="160" fill="${accent}" fill-opacity="0.24"/>
  <circle cx="250" cy="920" r="220" fill="${accent}" fill-opacity="0.18"/>
  <text x="120" y="220" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="rgba(255,255,255,0.68)">Reef Genesis</text>
  <text x="120" y="350" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="#fff">${escapeXml(item.name)}</text>
  <text x="120" y="440" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="rgba(255,255,255,0.82)">${escapeXml(item.subtitle ?? item.description ?? "")}</text>
  <text x="120" y="1030" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="rgba(255,255,255,0.62)">Live Reef collection asset</text>
</svg>`;
}

async function pinJson(payload, filename) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    filename
  );

  const response = await fetch(`${ipfsApiUrl}/api/v0/add?pin=true&cid-version=1`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`IPFS add failed with status ${response.status}`);
  }

  const raw = await response.text();
  const lastLine = raw.trim().split("\n").at(-1);
  if (!lastLine) {
    throw new Error("IPFS add did not return a CID");
  }

  const parsed = JSON.parse(lastLine);
  return `ipfs://${parsed.Hash}`;
}

async function main() {
  const minted = [];
  for (const [index, item] of manifest.items.entries()) {
    const metadata = {
      name: item.name,
      description: item.description,
      image: toDataUri(buildSvg(item)),
      attributes: item.attributes ?? []
    };
    const tokenUri = await pinJson(metadata, `reef-genesis-${index + 1}.json`);
    const to = item.to ?? process.env.MINT_TO ?? wallet.address;
    const tx = await collection.mintCreator(to, tokenUri);
    const receipt = await tx.wait();
    minted.push({
      to,
      tokenUri,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null
    });
  }
  console.log(JSON.stringify({ ok: true, collection: deployment.collection, minted }, null, 2));
}

await main();
