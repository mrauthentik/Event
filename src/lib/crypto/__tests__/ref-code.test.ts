import { describe, it, expect } from "vitest";
import { generateRefCode, isValidRefCode } from "../ref-code";
import { SITE_CONFIG } from "@/config/site";

describe("Reference Code Generator", () => {
  it("should generate a 10-character code starting with HGC-", () => {
    const code = generateRefCode();
    expect(code.startsWith("HGC-")).toBe(true);
    expect(code).toHaveLength(10); // "HGC-" (4) + 6 chars
    expect(isValidRefCode(code)).toBe(true);
  });

  it("should never include ambiguous characters (0, O, 1, I)", () => {
    const ambiguous = ["0", "O", "1", "I"];
    for (let i = 0; i < 50; i++) {
      const code = generateRefCode();
      for (const char of ambiguous) {
        expect(code.includes(char)).toBe(false);
      }
    }
  });

  it("should reject invalid codes", () => {
    expect(isValidRefCode("XYZ-123456")).toBe(false);
    expect(isValidRefCode("HGC-12345")).toBe(false);
    expect(isValidRefCode("HGC-000000")).toBe(false); // contains '0'
    expect(isValidRefCode("HGC-ABCDEI")).toBe(false); // contains 'I'
  });
});
