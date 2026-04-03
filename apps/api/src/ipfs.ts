import { config } from "./config.js";
import {
  markIpfsReady,
  markIpfsUnavailable
} from "./runtime.js";
import { writeIpfsFallbackJson } from "./storage.js";

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
      demo: false
    };
  } catch (error) {
    const contents = JSON.stringify(payload, null, 2);
    const cid = `demo-${Date.now()}`;
    const filenameOnDisk = filename.endsWith(".json") ? filename : `${filename}.json`;
    const gatewayUrl = writeIpfsFallbackJson(filenameOnDisk, contents);
    markIpfsUnavailable(error);
    return {
      cid,
      uri: `ipfs://${cid}`,
      gatewayUrl,
      filename,
      demo: true
    };
  }
}
