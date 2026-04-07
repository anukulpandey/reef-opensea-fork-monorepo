import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { config, nodeConfig } from "./config.js";
import { markIpfsReady, markIpfsUnavailable } from "./runtime.js";
import { writeIpfsFallbackFile, writeIpfsFallbackJson } from "./storage.js";

function normalizeIpfsPath(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return uri.slice("ipfs://".length);
  }
  return uri;
}

function isLocalFallbackIpfsPath(ipfsPath: string) {
  return ipfsPath.startsWith("local/");
}

function hashContents(contents: Uint8Array | string) {
  return crypto.createHash("sha1").update(contents).digest("hex").slice(0, 12);
}

function sanitizeFilename(filename: string) {
  return filename
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]+/g, "-"))
    .join("/")
    .replace(/^-+|-+$/g, "") || "asset";
}

function buildLocalIpfsUri(relativeFilename: string) {
  return `ipfs://local/${relativeFilename}`;
}

function buildLocalIpfsGatewayUrl(relativeFilename: string) {
  return `${config.publicStorageBasePath}/ipfs/${relativeFilename}`;
}

function createLocalJsonFallback(payload: unknown, filename: string) {
  const serialized = JSON.stringify(payload, null, 2);
  const safeFilename = sanitizeFilename(filename.replace(/\.json$/i, "")) || "metadata";
  const hashedFilename = `${safeFilename}-${hashContents(serialized)}.json`;
  const gatewayUrl = writeIpfsFallbackJson(hashedFilename, serialized);
  return {
    cid: `local-${hashContents(serialized)}`,
    uri: buildLocalIpfsUri(hashedFilename),
    gatewayUrl,
    filename: hashedFilename,
    fallback: true as const
  };
}

function createLocalFileFallback(input: {
  contents: Uint8Array;
  filename: string;
}) {
  const safeFilename = sanitizeFilename(input.filename);
  const extension = path.extname(safeFilename);
  const stem = safeFilename.slice(0, Math.max(1, safeFilename.length - extension.length));
  const hashedFilename = `${stem}-${hashContents(input.contents)}${extension}`;
  const gatewayUrl = writeIpfsFallbackFile(hashedFilename, input.contents);
  return {
    cid: `local-${hashContents(input.contents)}`,
    uri: buildLocalIpfsUri(hashedFilename),
    gatewayUrl,
    filename: hashedFilename,
    fallback: true as const
  };
}

export function toGatewayUrl(uri: string) {
  if (!uri) {
    return "";
  }
  if (uri.startsWith("ipfs://")) {
    const ipfsPath = normalizeIpfsPath(uri);
    if (isLocalFallbackIpfsPath(ipfsPath)) {
      return buildLocalIpfsGatewayUrl(ipfsPath.slice("local/".length));
    }
    return `${nodeConfig.services.ipfsGatewayUrl}/${ipfsPath}`;
  }
  return uri;
}

export async function checkIpfsHealth() {
  try {
    const response = await fetch(`${config.ipfsApiUrl}/api/v0/version`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`IPFS version failed with status ${response.status}`);
    }
    markIpfsReady();
    return true;
  } catch (error) {
    markIpfsUnavailable(error);
    return false;
  }
}

export async function pinJsonToIpfs(payload: unknown, filename = "metadata.json") {
  try {
    const formData = new FormData();
    const contents = JSON.stringify(payload, null, 2);
    formData.append(
      "file",
      new Blob([contents], { type: "application/json" }),
      filename
    );

    const response = await fetch(
      `${config.ipfsApiUrl}/api/v0/add?pin=true&cid-version=1`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`IPFS add failed with status ${response.status}`);
    }

    const rawText = await response.text();
    const lastLine = rawText.trim().split("\n").at(-1);

    if (!lastLine) {
      throw new Error("IPFS did not return a CID");
    }

    const parsed = JSON.parse(lastLine) as { Hash: string; Name: string };
    markIpfsReady();
    return {
      cid: parsed.Hash,
      uri: `ipfs://${parsed.Hash}`,
      gatewayUrl: `${config.ipfsGatewayUrl}/${parsed.Hash}`,
      filename: parsed.Name,
      fallback: false as const
    };
  } catch (error) {
    markIpfsUnavailable(error);
    return createLocalJsonFallback(payload, filename);
  }
}

export async function pinFileToIpfs(input: {
  contents: Uint8Array;
  filename: string;
  contentType?: string;
}) {
  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(input.contents).buffer], {
        type: input.contentType || "application/octet-stream"
      }),
      input.filename
    );

    const response = await fetch(
      `${config.ipfsApiUrl}/api/v0/add?pin=true&cid-version=1`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`IPFS add failed with status ${response.status}`);
    }

    const rawText = await response.text();
    const lastLine = rawText.trim().split("\n").at(-1);

    if (!lastLine) {
      throw new Error("IPFS did not return a CID");
    }

    const parsed = JSON.parse(lastLine) as { Hash: string; Name: string };
    markIpfsReady();
    return {
      cid: parsed.Hash,
      uri: `ipfs://${parsed.Hash}`,
      gatewayUrl: `${config.ipfsGatewayUrl}/${parsed.Hash}`,
      filename: parsed.Name,
      fallback: false as const
    };
  } catch (error) {
    markIpfsUnavailable(error);
    return createLocalFileFallback(input);
  }
}

export async function readJsonFromIpfs(uri: string) {
  const ipfsPath = normalizeIpfsPath(uri);
  if (isLocalFallbackIpfsPath(ipfsPath)) {
    const absolutePath = path.join(config.storageIpfsFallbackRoot, ipfsPath.slice("local/".length));
    const contents = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(contents) as Record<string, unknown>;
  }
  const response = await fetch(
    `${config.ipfsApiUrl}/api/v0/cat?arg=${encodeURIComponent(ipfsPath)}`
  );

  if (!response.ok) {
    throw new Error(`IPFS cat failed with status ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}
