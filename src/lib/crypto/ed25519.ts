import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// Configure SHA-512 for @noble/ed25519
ed.hashes.sha512 = (...messages: Uint8Array[]) => sha512(ed.etc.concatBytes(...messages));

/**
 * Encodes a byte array to base64url without padding.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decodes a base64url string to Uint8Array.
 */
export function base64UrlToBytes(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64url"));
  }
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes sha256 hex hash of a string.
 */
export async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SignedTicketPayload {
  version: number;
  attendeeId: string;
  nonce: string; // 128-bit hex
}

/**
 * Generates an Ed25519 keypair for ticket signing and offline verification.
 */
export async function generateTicketKeyPair(): Promise<{ privateKeyHex: string; publicKeyHex: string }> {
  const { secretKey, publicKey } = ed.keygen();
  return {
    privateKeyHex: ed.etc.bytesToHex(secretKey),
    publicKeyHex: ed.etc.bytesToHex(publicKey),
  };
}

/**
 * Issues an opaque, tamper-proof signed ticket token.
 * Contains no PII.
 */
export async function createTicketToken(
  attendeeId: string,
  privateKeyHex: string
): Promise<{ tokenString: string; tokenHash: string }> {
  const nonceBytes = ed.etc.randomBytes(16);
  const nonceHex = ed.etc.bytesToHex(nonceBytes);

  const payload: SignedTicketPayload = {
    version: 1,
    attendeeId,
    nonce: nonceHex,
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const privKeyBytes = ed.etc.hexToBytes(privateKeyHex);

  const signature = await ed.signAsync(payloadBytes, privKeyBytes);

  // Format: Base64Url(payload) . Base64Url(signature)
  const tokenString = `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
  const tokenHash = await sha256Hex(tokenString);

  return { tokenString, tokenHash };
}

/**
 * Verifies a ticket token offline using ONLY the public key.
 */
export async function verifyTicketToken(
  tokenString: string,
  publicKeyHex: string
): Promise<{ isValid: boolean; payload?: SignedTicketPayload; error?: string }> {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) {
      return { isValid: false, error: "Malformed token structure" };
    }

    const payloadBytes = base64UrlToBytes(parts[0]);
    const signatureBytes = base64UrlToBytes(parts[1]);
    const pubKeyBytes = ed.etc.hexToBytes(publicKeyHex);

    const isValid = await ed.verifyAsync(signatureBytes, payloadBytes, pubKeyBytes);
    if (!isValid) {
      return { isValid: false, error: "Invalid signature (forged ticket)" };
    }

    const payloadText = new TextDecoder().decode(payloadBytes);
    const payload: SignedTicketPayload = JSON.parse(payloadText);

    if (payload.version !== 1 || !payload.attendeeId || !payload.nonce) {
      return { isValid: false, error: "Invalid payload schema" };
    }

    return { isValid: true, payload };
  } catch (err: any) {
    return { isValid: false, error: err?.message || "Verification failed" };
  }
}
