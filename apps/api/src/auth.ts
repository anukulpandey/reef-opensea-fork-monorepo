import crypto from "node:crypto";

import { verifyMessage } from "ethers";

const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT"
};

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signHmac(input: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(input).digest());
}

export function createNonce() {
  return crypto.randomBytes(16).toString("hex");
}

export function buildAuthMessage(address: string, nonce: string, chainName: string) {
  return [
    "OpenSea on Reef",
    "",
    `Sign in with wallet: ${address.toLowerCase()}`,
    `Network: ${chainName}`,
    `Nonce: ${nonce}`,
    "",
    "This request does not trigger a blockchain transaction."
  ].join("\n");
}

export function verifyWalletSignature(input: {
  address: string;
  message: string;
  signature: string;
}) {
  const recovered = verifyMessage(input.message, input.signature);
  return recovered.toLowerCase() === input.address.toLowerCase();
}

export function issueAccessToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 60 * 60 * 8
) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const encodedHeader = base64url(JSON.stringify(TOKEN_HEADER));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function readAccessToken(token: string, secret: string) {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("Malformed token.");
  }

  const expected = signHmac(`${encodedHeader}.${encodedPayload}`, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(decodeBase64url(encodedPayload));
  const exp = Number(payload.exp ?? 0);
  if (!exp || exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }

  return payload as {
    sub: string;
    role?: string;
    displayName?: string;
    exp: number;
    iat: number;
  };
}
