import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, or, like } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { createTicketToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { SupportedCurrency } from "@/config/currencies";

const recoverSchema = z
  .object({
    reference: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
  })
  .refine((d) => d.reference || d.phone || d.email, {
    message: "Provide a reference code, phone number, or email.",
  });

/**
 * POST /api/tickets/recover
 * "I paid but got no ticket" recovery flow.
 * - Looks up orders by ref code, phone, or email.
 * - For pending orders, queries the gateway directly and reconciles.
 * - Resends ticket links via SMS/email.
 * - Always returns a generic success message to prevent enumeration.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`ticket_recover:${ip}`, 8, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { reference, phone, email } = recoverSchema.parse(body);

    // 1. Find candidate orders
    const conditions = [];
    if (reference) {
      conditions.push(eq(orders.reference, reference.trim().toUpperCase()));
    }
    if (phone) {
      const normalized = phone.trim();
      conditions.push(like(orders.payerPhoneE164, `%${normalized.replace(/\D/g, "").slice(-10)}`));
    }
    if (email) {
      conditions.push(eq(orders.payerEmail, email.trim().toLowerCase()));
    }

    const candidateOrders = await db.query.orders.findMany({
      where: conditions.length === 1 ? conditions[0] : or(...conditions),
      limit: 5,
    });

    // 2. Reconcile each candidate that isn't already paid
    const signingKey =
      process.env.TICKET_SIGNING_SECRET ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    for (const order of candidateOrders) {
      if (order.status === "paid") {
        // Already paid — just resend ticket links below
      } else if (order.status === "pending_payment") {
        // Query gateway directly to reconcile
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
                providerCaptureId: verification.captureId || null,
                status: "completed",
                currency: order.currency,
                amountMinor: order.totalMinor,
              });

              const atts = await tx.query.attendees.findMany({
                where: (a, { eq }) => eq(a.orderId, order.id),
              });
              for (const att of atts) {
                const { tokenHash } = await createTicketToken(att.id, signingKey);
                await tx
                  .update(attendees)
                  .set({ status: "confirmed", qrTokenHash: tokenHash, updatedAt: new Date() })
                  .where(eq(attendees.id, att.id));
              }
            });
            order.status = "paid";
          }
        } catch (err) {
          console.error(`Recovery reconcile failed for ${order.reference}:`, err);
        }
      }
    }

    // 3. Resend ticket links for paid orders (fire-and-forget)
    const paidOrders = candidateOrders.filter((o) => o.status === "paid");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const order of paidOrders) {
      const orderAttendees = await db.query.attendees.findMany({
        where: (a, { eq }) => eq(a.orderId, order.id),
      });

      for (const att of orderAttendees) {
        deliverTicket({
          attendeeName: att.name,
          refCode: order.reference,
          phoneE164: att.phoneE164,
          email: att.email || order.payerEmail,
          ticketUrl: `${appUrl}/ticket/${order.reference}`,
        }).catch((err) => console.error("Ticket delivery failed:", err));
      }
    }

    // Generic response — never reveal whether a match was found
    return NextResponse.json({
      success: true,
      message:
        "If a paid registration matches your details, your ticket link has been resent via SMS/email. Please check your messages.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    console.error("Ticket recovery error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact the help desk." },
      { status: 500 }
    );
  }
}
