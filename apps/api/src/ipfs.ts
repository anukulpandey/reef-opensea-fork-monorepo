import { config, nodeConfig } from "./config.js";
import { markIpfsReady, markIpfsUnavailable } from "./runtime.js";

function normalizeIpfsPath(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return uri.slice("ipfs://".length);
  }
  return uri;
}

export function toGatewayUrl(uri: string) {
  if (!uri) {
    return "";
  }
  if (uri.startsWith("ipfs://")) {
    return `${nodeConfig.services.ipfsGatewayUrl}/${normalizeIpfsPath(uri)}`;
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
      filename: parsed.Name
    };
  } catch (error) {
    markIpfsUnavailable(error);
    throw error;
  }
}

export async function readJsonFromIpfs(uri: string) {
  const ipfsPath = normalizeIpfsPath(uri);
  const response = await fetch(
    `${config.ipfsApiUrl}/api/v0/cat?arg=${encodeURIComponent(ipfsPath)}`
  );

  if (!response.ok) {
    throw new Error(`IPFS cat failed with status ${response.status}`);
  }

  return (await response.json()) as Record<string, unknown>;
}
