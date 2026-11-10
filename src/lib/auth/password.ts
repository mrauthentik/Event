import { argon2id } from "hash-wasm";

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const ITERATIONS = 3;
const MEMORY_SIZE = 65536; // 64 MiB
const PARALLELISM = 1;

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** Hash a password with Argon2id. Returns `saltHex:hashHex`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await argon2id({
    password,
    salt,
    iterations: ITERATIONS,
    memorySize: MEMORY_SIZE,
    parallelism: PARALLELISM,
    hashLength: HASH_BYTES,
    outputType: "binary",
  });
  return `${toHex(salt)}:${toHex(hash)}`;
}

/** Verify a password against a `saltHex:hashHex` stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const hash = await argon2id({
    password,
    salt: fromHex(saltHex),
    iterations: ITERATIONS,
    memorySize: MEMORY_SIZE,
    parallelism: PARALLELISM,
    hashLength: HASH_BYTES,
    outputType: "binary",
  });

  const computed = toHex(hash);
  // Constant-time comparison
  if (computed.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
