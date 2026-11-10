/**
 * Ticket token signing/verification using HMAC-SHA256 (Web Crypto).
 *
 * NOTE: filename kept as `ed25519.ts` for import compatibility — the
 * implementation is now symmetric HMAC, not Ed25519. The QR payload format
 * is unchanged: `base64url(payloadJson).base64url(signature)`.
 *
 * Server signs with TICKET_SIGNING_SECRET (private).
 * Scanner verifies with NEXT_PUBLIC_TICKET_VERIFYING_SECRET (embedded in bundle).
 */

export interface SignedTicketPayload {
  version: number;
  attendeeId: string;
  nonce: string; // 128-bit hex
}

/**
 * Encodes a byte array to base64url without padding.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decodes a base64url string to Uint8Array.
 */
export function base64UrlToBytes(str: string): Uint8Array {
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

function randomNonceHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Issues an opaque, tamper-proof ticket token.
 * Contains no PII. `secret` is the shared HMAC secret.
 */
export async function createTicketToken(
  attendeeId: string,
  secret: string
): Promise<{ tokenString: string; tokenHash: string }> {
  const payload: SignedTicketPayload = {
    version: 1,
    attendeeId,
    nonce: randomNonceHex(),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes);

  const tokenString = `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const tokenHash = await sha256Hex(tokenString);

  return { tokenString, tokenHash };
}

/** Constant-time byte comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verifies a ticket token offline using the shared HMAC secret.
 */
export async function verifyTicketToken(
  tokenString: string,
  secret: string
): Promise<{ isValid: boolean; payload?: SignedTicketPayload; error?: string }> {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) {
      return { isValid: false, error: "Malformed token structure" };
    }

    const payloadBytes = base64UrlToBytes(parts[0]);
    const signatureBytes = base64UrlToBytes(parts[1]);

    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as Uint8Array<ArrayBuffer>,
      payloadBytes as Uint8Array<ArrayBuffer>
    );
    if (!valid) {
      return { isValid: false, error: "Invalid signature (forged ticket)" };
    }

    const payloadText = new TextDecoder().decode(payloadBytes);
    const payload: SignedTicketPayload = JSON.parse(payloadText);

    if (payload.version !== 1 || !payload.attendeeId || !payload.nonce) {
      return { isValid: false, error: "Invalid payload schema" };
    }

    return { isValid: true, payload };
  } catch (err: any) {
    console.error("[verifyTicketToken] threw:", err);
    return { isValid: false, error: err?.message || "Verification failed" };
  }
}
