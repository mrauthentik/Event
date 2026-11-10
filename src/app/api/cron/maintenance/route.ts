import { NextRequest, NextResponse } from "next/server";
import { eq, and, lt, ne, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { CURRENCIES, SupportedCurrency } from "@/config/currencies";
import { createTicketToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";

export const dynamic = "force-dynamic";

/**
 * Scheduled maintenance job — call every 5 minutes via cron/Vercel Cron.
 * 1. Expires pending_payment orders past their expiresAt (releases capacity).
 * 2. Reconciles pending orders against the payment gateway.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { expired: 0, reconciled: 0, stillPending: 0, errors: 0 };

  // ── 1. Expire stale pending orders ──────────────────────────────
  try {
    const stale = await db
      .select({ id: orders.id, reference: orders.reference })
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending_payment"),
          lt(orders.expiresAt, new Date())
        )
      )
      .limit(200);

    for (const order of stale) {
      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        // Release reserved seats
        await tx
          .update(attendees)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)));
      });
      results.expired++;
    }
  } catch (err) {
    console.error("[cron] expiry failed:", err);
    results.errors++;
  }

  // ── 2. Reconcile pending orders with gateways ───────────────────
  try {
    const pending = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending_payment"))
      .limit(100);

    const signingKey =
      process.env.TICKET_SIGNING_SECRET ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    for (const order of pending) {
      try {
        const provider = getPaymentProvider(order.currency as SupportedCurrency);
        const verification = await provider.verifyPayment(order.reference);

        if (verification.isSuccessful) {
          await db.transaction(async (tx) => {
            await tx
              .update(orders)
              .set({ status: "paid", updatedAt: new Date() })
              .where(eq(orders.id, order.id));

            await tx.insert(payments).values({
              orderId: order.id,
              provider: order.currency === "NGN" ? "paystack" : "paypal",
              providerRef: verification.providerRef || order.reference,
              providerCaptureId: verification.providerRef || null,
              status: "completed",
              currency: order.currency,
              amountMinor: verification.amountMinor || order.totalMinor,
              rawPayloadHash: null,
            });

            const atts = await tx
              .select()
              .from(attendees)
              .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)));

            for (const att of atts) {
              const { tokenHash } = await createTicketToken(att.id, signingKey);
              await tx
                .update(attendees)
                .set({ status: "confirmed", qrTokenHash: tokenHash, updatedAt: new Date() })
                .where(eq(attendees.id, att.id));
            }
          });

          // Deliver tickets (SMS/email) — non-blocking
          const atts = await db
            .select()
            .from(attendees)
            .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)));
          for (const att of atts) {
            deliverTicket({
              attendeeName: att.name,
              refCode: att.refCode,
              phoneE164: att.phoneE164,
              email: att.email,
              ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/ticket/${order.reference}`,
            }).catch(() => {});
          }

          results.reconciled++;
        } else if (verification.isPending) {
          results.stillPending++;
        }
      } catch (err) {
        console.error(`[cron] reconcile ${order.reference} failed:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[cron] reconciliation failed:", err);
    results.errors++;
  }

  return NextResponse.json({ success: true, ...results, ranAt: new Date().toISOString() });
}
