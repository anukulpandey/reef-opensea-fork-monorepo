import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { Wallet } from "ethers";
import { buildPublicConfig, resolveNodeAppConfig } from "@reef/config";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

export const repoRoot = path.resolve(process.cwd(), "../..");
export const nodeConfig = resolveNodeAppConfig({ cwd: repoRoot });
export const publicConfig = buildPublicConfig(nodeConfig);

const configuredAdminWallets = String(process.env.ADMIN_WALLETS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const privateKeyAdmin =
  process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.trim()
    ? new Wallet(process.env.PRIVATE_KEY.trim()).address.toLowerCase()
    : null;
const adminWallets = Array.from(
  new Set([
    ...configuredAdminWallets,
    ...(privateKeyAdmin ? [privateKeyAdmin] : [])
  ])
);

export const config = {
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://reef:reef@localhost:5432/reef_marketplace",
  ipfsApiUrl: process.env.IPFS_API_URL ?? nodeConfig.services.ipfsApiUrl,
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL ?? nodeConfig.services.ipfsGatewayUrl,
  rpcUrl: process.env.REEF_RPC_URL ?? nodeConfig.network.rpcUrl,
  storageRoot: path.resolve(repoRoot, nodeConfig.storage.rootDir),
  storagePublicRoot: path.resolve(repoRoot, nodeConfig.storage.publicDir),
  storageGeneratedRoot: path.resolve(repoRoot, nodeConfig.storage.generatedDir),
  storageIpfsFallbackRoot: path.resolve(repoRoot, nodeConfig.storage.ipfsFallbackDir),
  adminWallets,
  publicStorageBasePath: nodeConfig.storage.publicBasePath,
  deploymentPath: nodeConfig.contracts.artifactPaths.deployment,
  bootstrapPath: nodeConfig.contracts.artifactPaths.bootstrap
};

export function ensureLocalDirectories() {
  const requiredPaths = [
    config.storageRoot,
    config.storagePublicRoot,
    config.storageGeneratedRoot,
    config.storageIpfsFallbackRoot
  ];

  for (const requiredPath of requiredPaths) {
    fs.mkdirSync(requiredPath, { recursive: true });
  }
}
