import { scannerDb, CachedAttendee } from "@/lib/offline/dexie-db";
import { verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";

export type VerifyOutcome =
  | { status: "found"; attendee: CachedAttendee }
  | { status: "forged"; error: string }
  | { status: "unknown"; error: string };

function getVerifierSecret(): string {
  return process.env.NEXT_PUBLIC_TICKET_VERIFYING_SECRET || "";
}

async function findByAttendeeId(attendeeId: string): Promise<CachedAttendee | undefined> {
  return scannerDb.cachedAttendees.where("attendeeId").equals(attendeeId).first();
}

/**
 * Resolves a raw scanned string (QR payload or manual ref) to a cached
 * attendee, verifying the HMAC signature for signed tokens.
 */
export async function resolveScannedToken(tokenString: string): Promise<VerifyOutcome> {
  const pubKey = getVerifierSecret();
  const trimmed = tokenString.trim();
  const hash = await sha256Hex(trimmed);

  // 1. Fast path: local IndexedDB lookup by token hash
  let attendee = await scannerDb.cachedAttendees.get(hash);

  // 2. Plain ref code path (HGC-XXXXXX)
  if (!attendee && trimmed.startsWith("HGC-")) {
    attendee = await scannerDb.cachedAttendees.where("refCode").equals(trimmed).first();
  }

  // 3. Signed token path: verify HMAC, resolve by payload.attendeeId
  if (!attendee && trimmed.includes(".") && pubKey) {
    const verified = await verifyTicketToken(trimmed, pubKey);
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
    if (!pubKey) {
      return {
        status: "forged",
        error: "Verifier secret not configured (NEXT_PUBLIC_TICKET_VERIFYING_SECRET).",
      };
    }
    const verified = await verifyTicketToken(trimmed, pubKey);
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
