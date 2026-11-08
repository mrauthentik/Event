import { SITE_CONFIG } from "@/config/site";

/**
 * Generates an unambiguous reference code in the format `HGC-XXXXXX`.
 * Uses only characters that cannot be easily confused (no 0/O, 1/I).
 */
export function generateRefCode(length = 6): string {
  const chars = SITE_CONFIG.refCodeAlphabet;
  let code = "";
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `${SITE_CONFIG.refCodePrefix}${code}`;
}

export function isValidRefCode(code: string): boolean {
  if (!code.startsWith(SITE_CONFIG.refCodePrefix)) return false;
  const suffix = code.slice(SITE_CONFIG.refCodePrefix.length);
  if (suffix.length !== 6) return false;
  const validChars = new Set(SITE_CONFIG.refCodeAlphabet);
  for (const c of suffix) {
    if (!validChars.has(c)) return false;
  }
  return true;
}
