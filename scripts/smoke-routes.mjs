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

async function expectJsonRequest(route, init) {
  const response = await fetch(`${apiBaseUrl}${route}`, init);
  if (!response.ok) {
    throw new Error(`API request failed ${route}: ${response.status}`);
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

async function expectPublicAsset(url) {
  const absoluteUrl = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
  const response = await fetch(absoluteUrl, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(`Public asset failed ${url}: ${response.status}`);
  }
}

const bootstrap = await expectJson("/bootstrap");
const collectionsIndex = await expectJson("/dataset/collections");
const connectedProfile = await expectJson(
  "/dataset/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f"
);
for (const key of ["galleries", "items", "tokens", "listings", "offers", "activity", "createdCollections"]) {
  if (!Array.isArray(connectedProfile?.[key])) {
    throw new Error(`Profile payload is missing live array field: ${key}`);
  }
}
if (!connectedProfile?.portfolio || typeof connectedProfile.portfolio !== "object") {
  throw new Error("Profile payload is missing portfolio summary");
}
const creatorSlug = bootstrap.featuredCollections?.[0]?.creatorSlug ?? "reef-admin";
const primaryCollection =
  collectionsIndex.collections?.[0] ??
  bootstrap.featuredCollections?.[0] ??
  null;
const collectionSlug = primaryCollection?.slug ?? "";

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
  "/create",
  "/create?collection=heatblast&batch=1",
  "/create/drop",
  "/create/collection",
  "/drops",
  "/activity",
  "/rewards",
  "/studio",
  "/support",
  "/admin",
  "/profile",
  "/profile/created",
  `/${creatorSlug}/created`,
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=galleries",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=items&q=heat",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=tokens",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=portfolio",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=listings",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=offers",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=created",
  "/profile/0x212e2A4545ee7AC59837212F9860DbC245090B6f?tab=activity"
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

const sampleIpfsJson = await expectJsonRequest("/ipfs/json", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    filename: "smoke-metadata.json",
    payload: {
      name: "Smoke Metadata",
      description: "Collection/IPFS smoke fallback"
    }
  })
});

if (!sampleIpfsJson?.uri || !sampleIpfsJson?.gatewayUrl) {
  throw new Error("IPFS JSON smoke request did not return uri/gatewayUrl");
}
console.log("api ok  /ipfs/json");

const sampleIpfsFile = await expectJsonRequest("/ipfs/file", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    filename: "smoke-asset.svg",
    contentType: "image/svg+xml",
    dataUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="#111315"/><circle cx="32" cy="32" r="20" fill="#2081e2"/></svg>'
      )
  })
});

if (!sampleIpfsFile?.uri || !sampleIpfsFile?.gatewayUrl) {
  throw new Error("IPFS file smoke request did not return uri/gatewayUrl");
}
console.log("api ok  /ipfs/file");

for (const route of webRoutes) {
  await expectHtml(route);
  console.log(`web ok  ${route}`);
}

const profileImages = [
  connectedProfile?.createdItems?.[0]?.imageUrl,
  primaryCollection?.featuredImageUrls?.[0],
  sampleIpfsJson?.gatewayUrl,
  sampleIpfsFile?.gatewayUrl
].filter((value) => typeof value === "string" && value.startsWith("/storage/"));

for (const assetUrl of profileImages) {
  await expectPublicAsset(assetUrl);
  console.log(`asset ok ${assetUrl}`);
}

console.log("Route smoke check completed successfully.");
