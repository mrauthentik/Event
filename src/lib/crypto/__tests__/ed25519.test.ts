import { describe, it, expect } from "vitest";
import {
  createTicketToken,
  verifyTicketToken,
} from "../ed25519";

const SECRET = "test-ticket-secret";
const WRONG_SECRET = "attacker-secret";

describe("HMAC Ticket Token", () => {
  it("should create a signed ticket and verify it with the same secret", async () => {
    const attendeeId = "att_123456789";
    const { tokenString, tokenHash } = await createTicketToken(attendeeId, SECRET);

    expect(tokenString).toBeDefined();
    expect(tokenString).toContain(".");
    expect(tokenHash).toHaveLength(64); // sha256 hex string

    const verification = await verifyTicketToken(tokenString, SECRET);
    expect(verification.isValid).toBe(true);
    expect(verification.payload?.attendeeId).toBe(attendeeId);
    expect(verification.payload?.version).toBe(1);
    expect(verification.payload?.nonce).toBeDefined();
  });

  it("should reject a forged ticket signed with a different secret", async () => {
    const forged = await createTicketToken("forged_attendee", WRONG_SECRET);

    const verification = await verifyTicketToken(forged.tokenString, SECRET);
    expect(verification.isValid).toBe(false);
    expect(verification.error).toContain("Invalid signature");
  });

  it("should reject a tampered token payload", async () => {
    const { tokenString } = await createTicketToken("real_attendee", SECRET);
    const parts = tokenString.split(".");

    // Tamper with payload part
    const tampered = `eyJhdHRlbmRlZUlkIjoidGFtcGVyZWQifQ.${parts[1]}`;

    const verification = await verifyTicketToken(tampered, SECRET);
    expect(verification.isValid).toBe(false);
  });

  it("should reject malformed tokens", async () => {
    const verification = await verifyTicketToken("not-a-token", SECRET);
    expect(verification.isValid).toBe(false);
  });
});
