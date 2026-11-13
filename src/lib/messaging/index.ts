/**
 * Transactional messaging: SMS (Termii) and Email (Resend).
 * Both are fire-and-forget friendly — callers should not block
 * registration on delivery. Failures are logged, never thrown.
 */

export interface TicketDeliveryPayload {
  attendeeName: string;
  refCode: string;
  phoneE164: string;
  email?: string | null;
  ticketUrl: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "HOREMOW";

  if (!apiKey || apiKey.startsWith("mock_")) {
    console.info("[SMS] Delivery skipped because the provider is not configured.");
    return false;
  }

  try {
    const res = await fetch("https://v3.api.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone.replace(/^\+/, ""),
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.errors) {
    console.error("[SMS] Termii rejected a message.");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[SMS] Termii request failed.");
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "IHGC 2026 <no-reply@horemow.org>";

  if (!apiKey || apiKey.startsWith("re_mock")) {
    console.info("[Email] Delivery skipped because the provider is not configured.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[Email] Resend rejected a message.");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Resend request failed.");
    return false;
  }
}

export async function deliverTicket(payload: TicketDeliveryPayload): Promise<void> {
  const ticketUrl = payload.ticketUrl;
  const safeName = escapeHtml(payload.attendeeName);
  const safeRefCode = escapeHtml(payload.refCode);
  const safeTicketUrl = escapeHtml(ticketUrl);

  const smsMessage = `Horemow IHGC 2026: Your ticket for ${payload.attendeeName} is confirmed. Ref: ${payload.refCode}. Show your QR at the gate: ${ticketUrl}`;

  // SMS is primary delivery channel (email optional per brief 6.1)
  await sendSms(payload.phoneE164, smsMessage);

  if (payload.email) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111320">
        <h2 style="color:#0E1020">Your IHGC 2026 Ticket is Confirmed</h2>
        <p>Dear ${safeName},</p>
        <p>Your registration for the <strong>International Holiness General Conference 2026</strong> (8–11 December 2026, Holiness Campground, Kwali, Abuja) is confirmed.</p>
        <p><strong>Reference Code:</strong> <code style="background:#F3F4F6;padding:2px 6px;border-radius:4px">${safeRefCode}</code></p>
        <p style="margin:24px 0">
          <a href="${safeTicketUrl}" style="background:#0E1020;color:#8EE3D6;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">View Your Ticket & QR Code</a>
        </p>
        <p style="font-size:12px;color:#6B7280">Show this ticket at the registration stand on arrival. Keep your reference code handy.</p>
      </div>`;
    await sendEmail(payload.email, `IHGC 2026 Ticket Confirmed — ${payload.refCode}`, html);
  }
}
