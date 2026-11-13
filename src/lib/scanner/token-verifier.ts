import { scannerDb, CachedAttendee } from "@/lib/offline/dexie-db";
import { verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";

export type VerifyOutcome =
  | { status: "found"; attendee: CachedAttendee }
  | { status: "forged"; error: string }
  | { status: "unknown"; error: string };

function getVerifierPublicKey(): string {
  return process.env.NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY || "";
}

async function findByAttendeeId(attendeeId: string): Promise<CachedAttendee | undefined> {
  return scannerDb.cachedAttendees.where("attendeeId").equals(attendeeId).first();
}

/**
 * Resolves a raw scanned string (QR payload or manual ref) to a cached
 * attendee, verifying the HMAC signature for signed tokens.
 */
export async function resolveScannedToken(tokenString: string): Promise<VerifyOutcome> {
  const publicKey = getVerifierPublicKey();
  const trimmed = tokenString.trim();
  const hash = await sha256Hex(trimmed);

  // 1. Fast path: local IndexedDB lookup by token hash
  let attendee = await scannerDb.cachedAttendees.get(hash);

  // 2. Plain ref code path (HGC-XXXXXX)
  if (!attendee && trimmed.startsWith("HGC-")) {
    attendee = await scannerDb.cachedAttendees.where("refCode").equals(trimmed).first();
  }

  // 3. Signed token path: verify HMAC, resolve by payload.attendeeId
  if (!attendee && trimmed.includes(".") && publicKey) {
    const verified = await verifyTicketToken(trimmed, publicKey);
    if (verified.isValid && verified.payload?.attendeeId) {
      attendee = await findByAttendeeId(verified.payload.attendeeId);
    } else if (!verified.isValid) {
      return {
        status: "forged",
        error: `Invalid ticket signature — ${verified.error || "ticket rejected"}.`,
      };
    }
  }

  // 4. Non-ref tokens that weren't resolved above still need signature proof
  if (!attendee && !trimmed.startsWith("HGC-")) {
    if (!publicKey) {
      return {
        status: "forged",
        error: "Ticket verification key is not configured.",
      };
    }
    const verified = await verifyTicketToken(trimmed, publicKey);
    if (!verified.isValid) {
      return {
        status: "forged",
        error: "Invalid ticket signature — Ticket is forged or corrupted.",
      };
    }
    if (verified.payload?.attendeeId) {
      attendee = await findByAttendeeId(verified.payload.attendeeId);
    }
  }

  if (!attendee) {
    return {
      status: "unknown",
      error: "Valid cryptographic format, but attendee not found in camp database.",
    };
  }

  return { status: "found", attendee };
}
