import { getTicketVerifyingKey, sha256Hex, verifyTicketToken } from "@/lib/crypto/ed25519";

export async function verifyTicketProof(token: string): Promise<{ valid: true; tokenHash: string } | { valid: false }> {
  if (!token || token.length > 4096) return { valid: false };

  try {
    const verified = await verifyTicketToken(token, getTicketVerifyingKey());
    if (!verified.isValid) return { valid: false };
    return { valid: true, tokenHash: await sha256Hex(token) };
  } catch {
    return { valid: false };
  }
}
