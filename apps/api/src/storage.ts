import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

import { config } from "./config.js";
import { markStorageReady, markStorageUnavailable } from "./runtime.js";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hashToHue(input: string) {
  let hash = 0;
  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }
  return hash;
}

function buildCardSvg(title: string, subtitle: string, accentSeed: string, wide = false) {
  const hue = hashToHue(accentSeed);
  const width = wide ? 1600 : 900;
  const height = wide ? 520 : 900;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 84% 58%)"/>
      <stop offset="55%" stop-color="hsl(${(hue + 48) % 360} 88% 62%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 110) % 360} 76% 55%)"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="48" fill="#07111f"/>
  <rect width="${width}" height="${height}" rx="48" fill="url(#g)"/>
  <circle cx="${Math.round(width * 0.15)}" cy="${Math.round(height * 0.2)}" r="${Math.round(height * 0.18)}" fill="rgba(255,255,255,0.22)"/>
  <circle cx="${Math.round(width * 0.88)}" cy="${Math.round(height * 0.18)}" r="${Math.round(height * 0.12)}" fill="rgba(255,255,255,0.18)"/>
  <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.82)}" r="${Math.round(height * 0.23)}" fill="rgba(4,12,26,0.18)"/>
  <text x="72" y="${wide ? 120 : 170}" font-family="Arial, Helvetica, sans-serif" font-size="${wide ? 42 : 56}" fill="rgba(255,255,255,0.82)">${escapeXml(subtitle)}</text>
  <text x="72" y="${wide ? 220 : 300}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${wide ? 86 : 114}" fill="white">${escapeXml(title)}</text>
  <text x="72" y="${wide ? 290 : 382}" font-family="Arial, Helvetica, sans-serif" font-size="${wide ? 30 : 42}" fill="rgba(255,255,255,0.86)">Reef live marketplace asset</text>
</svg>`;
}

export function writeGeneratedSvg(relativePath: string, title: string, subtitle: string, seed: string, wide = false) {
  const absolutePath = path.join(config.storageGeneratedRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buildCardSvg(title, subtitle, seed, wide), "utf8");
  return `${config.publicStorageBasePath}/generated/${relativePath}`;
}

export function writeIpfsFallbackJson(filename: string, contents: string) {
  const absolutePath = path.join(config.storageIpfsFallbackRoot, filename);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, "utf8");
  return `${config.publicStorageBasePath}/ipfs/${filename}`;
}

export function writeIpfsFallbackFile(filename: string, contents: Uint8Array | Buffer) {
  const absolutePath = path.join(config.storageIpfsFallbackRoot, filename);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
  return `${config.publicStorageBasePath}/ipfs/${filename}`;
}

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "";
  }
}

export function writeDataUrlAsset(relativeDir: string, stem: string, dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)((?:;[^,]+)*),([\s\S]+)$/);
  if (!match) {
    return "";
  }

  const mimeType = match[1]?.trim().toLowerCase() ?? "";
  if (!mimeType.startsWith("image/")) {
    return "";
  }

  const extension = extensionForMimeType(mimeType);
  if (!extension) {
    return "";
  }

  const parameters = match[2] ?? "";
  const body = match[3] ?? "";
  const isBase64 = parameters.toLowerCase().includes(";base64");
  const contents = isBase64
    ? Buffer.from(body, "base64")
    : Buffer.from(decodeURIComponent(body), "utf8");

  const hash = crypto.createHash("sha1").update(dataUrl).digest("hex").slice(0, 12);
  const filename = `${sanitizeSegment(stem)}-${hash}.${extension}`;
  const relativePath = path.join(relativeDir, filename);
  const absolutePath = path.join(config.storagePublicRoot, relativePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, contents);
  }

  const publicPath = path.posix.join(
    config.publicStorageBasePath,
    relativeDir.replaceAll(path.sep, "/"),
    filename
  );
  return publicPath;
}

export function initializeStorage() {
  try {
    fs.mkdirSync(config.storageRoot, { recursive: true });
    fs.mkdirSync(config.storagePublicRoot, { recursive: true });
    fs.mkdirSync(config.storageGeneratedRoot, { recursive: true });
    fs.mkdirSync(config.storageIpfsFallbackRoot, { recursive: true });
    markStorageReady();
  } catch (error) {
    markStorageUnavailable(error);
  }
}
