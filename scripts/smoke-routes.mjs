import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const apiBaseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? "4000"}`;
const webBaseUrl = process.env.WEB_BASE_URL ?? `http://127.0.0.1:${process.env.WEB_PORT ?? "3000"}`;

async function expectJson(route) {
  const response = await fetch(`${apiBaseUrl}${route}`);
  if (!response.ok) {
    throw new Error(`API route failed ${route}: ${response.status}`);
  }
  return response.json();
}

async function expectHtml(route) {
  const response = await fetch(`${webBaseUrl}${route}`);
  if (!response.ok) {
    throw new Error(`Web route failed ${route}: ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes('<div id="root"></div>') && !html.includes('<div id="root">')) {
    throw new Error(`Unexpected web response for ${route}`);
  }
}

const bootstrap = await expectJson("/bootstrap");
const creatorSlug = bootstrap.featuredCollections?.[0]?.creatorSlug ?? "reef-admin";
const collectionAddress =
  bootstrap.featuredCollections?.[0]?.contractAddress ??
  bootstrap.config.contracts.collection.address ??
  "";
const collectionSlug = collectionAddress
  ? bootstrap.featuredCollections?.[0]?.slug ?? bootstrap.config.contracts.collection.slug ?? ""
  : "";

let sampleContract = "";
let sampleTokenId = "";
if (collectionSlug) {
  const collection = await expectJson(`/dataset/collection/${collectionSlug}`);
  sampleContract = collection.items?.[0]?.contractAddress ?? "";
  sampleTokenId = collection.items?.[0]?.tokenId ?? "";
}

const apiRoutes = [
  "/health",
  "/config",
  "/bootstrap",
  "/dataset/discover",
  "/dataset/collections",
  "/listings",
  "/orders",
  "/sales",
  "/dataset/tokens",
  "/dataset/drops",
  "/dataset/activity",
  "/dataset/rewards",
  "/dataset/studio"
];

if (collectionSlug) {
  apiRoutes.push(`/dataset/collection/${collectionSlug}`);
}

if (sampleContract && sampleTokenId) {
  apiRoutes.push(`/dataset/item/${sampleContract}/${sampleTokenId}`);
}

const webRoutes = [
  "/",
  "/collections",
  "/collections?search=reef&sort=volume&category=all",
  "/tokens",
  "/swap",
  "/create",
  "/create/collection",
  "/drops",
  "/activity",
  "/rewards",
  "/studio",
  "/support",
  "/admin",
  "/profile",
  "/profile/created",
  `/${creatorSlug}/created`
];

if (collectionSlug) {
  webRoutes.push(
    `/collection/${collectionSlug}`,
    `/collection/${collectionSlug}/explore`,
    `/collection/${collectionSlug}/items`,
    `/collection/${collectionSlug}/offers`,
    `/collection/${collectionSlug}/holders`,
    `/collection/${collectionSlug}/activity`,
    `/collection/${collectionSlug}/analytics`,
    `/collection/${collectionSlug}/traits`,
    `/collection/${collectionSlug}/about`
  );
}

if (sampleContract && sampleTokenId) {
  webRoutes.push(`/item/reef/${sampleContract}/${sampleTokenId}`);
}

for (const route of apiRoutes) {
  await expectJson(route);
  console.log(`api ok  ${route}`);
}

for (const route of webRoutes) {
  await expectHtml(route);
  console.log(`web ok  ${route}`);
}

console.log("Route smoke check completed successfully.");
