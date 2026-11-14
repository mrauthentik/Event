import { afterEach, describe, expect, it, vi } from "vitest";
import { createTicketToken, deriveTicketPublicKey } from "@/lib/crypto/ed25519";
import { verifyTicketProof } from "../ticket-proof";

const PRIVATE_KEY = "11".repeat(32);

describe("server ticket proof", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a correctly signed ticket and returns the exact stored-token hash", async () => {
    vi.stubEnv("NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY", await deriveTicketPublicKey(PRIVATE_KEY));
    const ticket = await createTicketToken("attendee-id", PRIVATE_KEY);

    await expect(verifyTicketProof(ticket.tokenString)).resolves.toEqual({ valid: true, tokenHash: ticket.tokenHash });
  });

  it("rejects modified and excessively long tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY", await deriveTicketPublicKey(PRIVATE_KEY));
    const ticket = await createTicketToken("attendee-id", PRIVATE_KEY);
    const tampered = `${ticket.tokenString.slice(0, -1)}a`;

    await expect(verifyTicketProof(tampered)).resolves.toEqual({ valid: false });
    await expect(verifyTicketProof("x".repeat(4097))).resolves.toEqual({ valid: false });
  });
});
