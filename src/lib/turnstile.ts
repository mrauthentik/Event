/**
 * Cloudflare Turnstile server-side verification.
 * Fails closed in production when keys are missing; fails open in development
 * so local work is not blocked before keys are provisioned.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Development bypass: no secret configured or Cloudflare test key → allow
  const isTestKey =
    !secret ||
    secret.startsWith("1x0000000000000000000000000000000") ||
    secret === "1x0000000000000000000000000000000AA";

  if (isTestKey && process.env.NODE_ENV !== "production") {
    return { success: true };
  }

  // No token provided
  if (!token) {
    return { success: false, error: "Bot verification token is missing." };
  }

  if (!secret) {
    return { success: false, error: "Bot protection is not configured." };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: "Bot verification failed. Please try again." };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Turnstile verification error:", err);
    return { success: false, error: "Bot verification service unavailable." };
  }
}
