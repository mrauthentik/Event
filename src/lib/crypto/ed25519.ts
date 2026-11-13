import { getPublicKeyAsync, signAsync, verifyAsync } from "@noble/ed25519";

export interface SignedTicketPayload {
  version: number;
  attendeeId: string;
  nonce: string;
}

interface SignedOrderAccessPayload {
  version: 1;
  purpose: "ticket-access";
  orderId: string;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url value");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.trim().replace(/^0x/i, "");
  if (!/^[a-f\d]{64}$/i.test(normalized)) {
    throw new Error("Ticket signing and verification keys must be 32-byte hex values.");
  }
  return Uint8Array.from(normalized.match(/.{2}/g)!, (byte) => parseInt(byte, 16));
}

export function getTicketSigningKey(): string {
  const key = process.env.TICKET_SIGNING_PRIVATE_KEY;
  if (!key) throw new Error("TICKET_SIGNING_PRIVATE_KEY is not configured.");
  hexToBytes(key);
  return key;
}

export function getTicketVerifyingKey(): string {
  const key = process.env.NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY is not configured.");
  hexToBytes(key);
  return key;
}

export async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createTicketToken(
  attendeeId: string,
  privateKeyHex: string
): Promise<{ tokenString: string; tokenHash: string }> {
  const payload: SignedTicketPayload = {
    version: 1,
    attendeeId,
    nonce: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await signAsync(payloadBytes, hexToBytes(privateKeyHex));
  const tokenString = `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
  return { tokenString, tokenHash: await sha256Hex(tokenString) };
}

export async function createOrderAccessToken(orderId: string, privateKeyHex = getTicketSigningKey()): Promise<string> {
  const payload: SignedOrderAccessPayload = { version: 1, purpose: "ticket-access", orderId };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await signAsync(payloadBytes, hexToBytes(privateKeyHex));
  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
}

export async function verifyOrderAccessToken(
  token: string,
  orderId: string,
  publicKeyHex = getTicketVerifyingKey()
): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || parts[0].length > 512) return false;
    const payloadBytes = base64UrlToBytes(parts[0]);
    const signature = base64UrlToBytes(parts[1]);
    if (signature.length !== 64) return false;
    if (!(await verifyAsync(signature, payloadBytes, hexToBytes(publicKeyHex)))) return false;
    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes));
    return payload?.version === 1 && payload?.purpose === "ticket-access" && payload?.orderId === orderId;
  } catch {
    return false;
  }
}

export async function verifyTicketToken(
  tokenString: string,
  publicKeyHex: string
): Promise<{ isValid: boolean; payload?: SignedTicketPayload; error?: string }> {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) return { isValid: false, error: "Malformed token structure" };

    const payloadBytes = base64UrlToBytes(parts[0]);
    const signature = base64UrlToBytes(parts[1]);
    if (signature.length !== 64) return { isValid: false, error: "Invalid signature length" };
    const valid = await verifyAsync(signature, payloadBytes, hexToBytes(publicKeyHex));
    if (!valid) return { isValid: false, error: "Invalid signature (forged ticket)" };

    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payloadBytes));
    if (
      !payload ||
      payload.version !== 1 ||
      typeof payload.attendeeId !== "string" ||
      typeof payload.nonce !== "string"
    ) {
      return { isValid: false, error: "Invalid payload schema" };
    }
    return { isValid: true, payload: payload as SignedTicketPayload };
  } catch {
    return { isValid: false, error: "Malformed or unverifiable ticket" };
  }
}

export async function deriveTicketPublicKey(privateKeyHex: string): Promise<string> {
  return Array.from(await getPublicKeyAsync(hexToBytes(privateKeyHex)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
