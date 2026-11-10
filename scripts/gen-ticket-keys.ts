/**
 * Generates an Ed25519 keypair for ticket signing/verification.
 * Run: node --experimental-strip-types scripts/gen-ticket-keys.ts
 * Put privateKeyHex in TICKET_SIGNING_PRIVATE_KEY and
 * publicKeyHex in NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY (.env).
 */
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = (...messages: Uint8Array[]) =>
  sha512((ed.etc as any).concatBytes(...messages));

const { secretKey, publicKey } = ed.keygen();

console.log("TICKET_SIGNING_PRIVATE_KEY=" + ed.etc.bytesToHex(secretKey));
console.log("NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY=" + ed.etc.bytesToHex(publicKey));
