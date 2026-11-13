import { describe, it, expect } from "vitest";
import {
  createOrderAccessToken,
  createTicketToken,
  deriveTicketPublicKey,
  verifyOrderAccessToken,
  verifyTicketToken,
} from "../ed25519";

const PRIVATE_KEY = "11".repeat(32);
const WRONG_PRIVATE_KEY = "22".repeat(32);

describe("Ed25519 ticket tokens", () => {
  it("signs tokens that verify with the public key only", async () => {
    const attendeeId = "att_123456789";
    const publicKey = await deriveTicketPublicKey(PRIVATE_KEY);
    const { tokenString, tokenHash } = await createTicketToken(attendeeId, PRIVATE_KEY);

    expect(tokenHash).toHaveLength(64);
    const verification = await verifyTicketToken(tokenString, publicKey);
    expect(verification.isValid).toBe(true);
    expect(verification.payload?.attendeeId).toBe(attendeeId);
    expect(verification.payload?.version).toBe(1);
    expect(verification.payload?.nonce).toBeDefined();
  });

  it("rejects signatures from a different private key", async () => {
    const publicKey = await deriveTicketPublicKey(PRIVATE_KEY);
    const forged = await createTicketToken("forged_attendee", WRONG_PRIVATE_KEY);
    const verification = await verifyTicketToken(forged.tokenString, publicKey);
    expect(verification.isValid).toBe(false);
    expect(verification.error).toContain("signature");
  });

  it("rejects tampered payloads and malformed tokens", async () => {
    const publicKey = await deriveTicketPublicKey(PRIVATE_KEY);
    const { tokenString } = await createTicketToken("real_attendee", PRIVATE_KEY);
    const [payload, signature] = tokenString.split(".");
    const tampered = `${payload.slice(0, -2)}AA.${signature}`;

    expect((await verifyTicketToken(tampered, publicKey)).isValid).toBe(false);
    expect((await verifyTicketToken("not-a-token", publicKey)).isValid).toBe(false);
  });

  it("requires the signed order capability token to match the order", async () => {
    const publicKey = await deriveTicketPublicKey(PRIVATE_KEY);
    const accessToken = await createOrderAccessToken("order_123", PRIVATE_KEY);
    expect(await verifyOrderAccessToken(accessToken, "order_123", publicKey)).toBe(true);
    expect(await verifyOrderAccessToken(accessToken, "order_456", publicKey)).toBe(false);
  });
});
