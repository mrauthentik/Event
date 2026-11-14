import { scannerDb, CachedAttendee } from "@/lib/offline/dexie-db";
import { verifyGroupOrderToken, verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";

export type VerifyOutcome =
  | { status: "found"; attendee: CachedAttendee }
  | { status: "group"; orderId: string; attendees: CachedAttendee[]; token: string }
  | { status: "forged"; error: string }
  | { status: "unknown"; error: string };

function getVerifierPublicKey(): string {
  return process.env.NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY || "";
}

export async function resolveScannedToken(tokenString: string): Promise<VerifyOutcome> {
  const publicKey = getVerifierPublicKey();
  const trimmed = tokenString.trim();

  if (trimmed.includes(".")) {
    const groupOrder = await verifyGroupOrderToken(trimmed, publicKey);
    if (groupOrder.isValid) {
      const attendees = await scannerDb.cachedAttendees.where("orderId").equals(groupOrder.payload.orderId).toArray();
      if (attendees.length !== groupOrder.payload.attendeeCount) {
        return {
          status: "unknown",
          error: "Group roster is incomplete on this scanner. Sync the attendee list while online before using the order QR.",
        };
      }
      return { status: "group", orderId: groupOrder.payload.orderId, attendees, token: trimmed };
    }
  }

  const tokenHash = await sha256Hex(trimmed);
  let attendee = await scannerDb.cachedAttendees.get(tokenHash);

  if (!attendee && /^HGC-[A-HJ-NP-Z2-9]{6}$/.test(trimmed)) {
    attendee = await scannerDb.cachedAttendees.where("refCode").equals(trimmed).first();
  }

  if (attendee) return { status: "found", attendee };
  if (/^HGC-[A-HJ-NP-Z2-9]{6}$/i.test(trimmed)) {
    return {
      status: "unknown",
      error: "A short reference can identify a ticket, but cannot authorize entry. Use Find attendee for a supervisor-approved manual check-in.",
    };
  }
  if (!publicKey) return { status: "forged", error: "Ticket verification key is not configured." };

  const verified = await verifyTicketToken(trimmed, publicKey);
  if (!verified.isValid || !verified.payload) {
    return {
      status: "forged",
      error: `Invalid ticket signature — ${verified.error || "ticket rejected"}.`,
    };
  }

  if (verified.payload.version === 1) {
    attendee = await scannerDb.cachedAttendees.where("attendeeId").equals(verified.payload.attendeeId).first();
  } else {
    attendee = await scannerDb.cachedAttendees.where("ticketId").equals(verified.payload.ticketId).first();
  }

  if (!attendee) {
    return { status: "unknown", error: "Valid signed ticket, but the attendee is not in the current scanner roster." };
  }
  return { status: "found", attendee };
}
