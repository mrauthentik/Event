import { describe, it, expect } from "vitest";
import {
  createGroupOrderToken,
  createOrderAccessToken,
  createTicketToken,
  deriveTicketPublicKey,
  base64UrlToBytes,
  verifyGroupOrderToken,
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
    expect(verification.payload?.version).toBe(2);
    if (verification.payload?.version === 2) expect(verification.payload.ticketId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(tokenString.split(".")[0])));
    expect(payload).not.toHaveProperty("attendeeId");
    expect((await createTicketToken(attendeeId, PRIVATE_KEY)).tokenString).toBe(tokenString);
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

  it("signs group order QR payloads and rejects invalid seat counts or forged signatures", async () => {
    const orderId = "550e8400-e29b-41d4-a716-446655440000";
    const publicKey = await deriveTicketPublicKey(PRIVATE_KEY);
    const token = await createGroupOrderToken(orderId, 4, PRIVATE_KEY);
    const verification = await verifyGroupOrderToken(token, publicKey);

    expect(verification.isValid).toBe(true);
    if (verification.isValid) {
      expect(verification.payload.orderId).toBe(orderId);
      expect(verification.payload.attendeeCount).toBe(4);
    }
    expect((await verifyGroupOrderToken(token, await deriveTicketPublicKey(WRONG_PRIVATE_KEY))).isValid).toBe(false);
    await expect(createGroupOrderToken(orderId, 0, PRIVATE_KEY)).rejects.toThrow();
  });
});
