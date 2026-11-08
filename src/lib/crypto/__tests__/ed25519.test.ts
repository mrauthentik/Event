import { describe, it, expect } from "vitest";
import {
  generateTicketKeyPair,
  createTicketToken,
  verifyTicketToken,
} from "../ed25519";

describe("Ed25519 Ticket Cryptography", () => {
  it("should create a signed ticket and verify it using only the public key", async () => {
    const { privateKeyHex, publicKeyHex } = await generateTicketKeyPair();

    const attendeeId = "att_123456789";
    const { tokenString, tokenHash } = await createTicketToken(attendeeId, privateKeyHex);

    expect(tokenString).toBeDefined();
    expect(tokenString).toContain(".");
    expect(tokenHash).toHaveLength(64); // sha256 hex string

    // Verify with correct public key
    const verification = await verifyTicketToken(tokenString, publicKeyHex);
    expect(verification.isValid).toBe(true);
    expect(verification.payload?.attendeeId).toBe(attendeeId);
    expect(verification.payload?.version).toBe(1);
    expect(verification.payload?.nonce).toBeDefined();
  });

  it("should reject a forged ticket signed by an unauthorized key", async () => {
    const legitimate = await generateTicketKeyPair();
    const attacker = await generateTicketKeyPair();

    // Attacker signs with their own private key
    const forged = await createTicketToken("forged_attendee", attacker.privateKeyHex);

    // Gate scanner checks against legitimate conference public key
    const verification = await verifyTicketToken(forged.tokenString, legitimate.publicKeyHex);
    expect(verification.isValid).toBe(false);
    expect(verification.error).toContain("Invalid signature");
  });

  it("should reject a tampered token payload", async () => {
    const { privateKeyHex, publicKeyHex } = await generateTicketKeyPair();

    const { tokenString } = await createTicketToken("real_attendee", privateKeyHex);
    const parts = tokenString.split(".");

    // Tamper with payload part
    const tampered = `eyJhdHRlbmRlZUlkIjoidGFtcGVyZWQifQ.${parts[1]}`;

    const verification = await verifyTicketToken(tampered, publicKeyHex);
    expect(verification.isValid).toBe(false);
  });
});
