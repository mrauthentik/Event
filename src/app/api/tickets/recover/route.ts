import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, or, like } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments } from "@/db/schema";
import { getPaymentProviderByName } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const recoverSchema = z
  .object({
    reference: z.string().trim().max(16).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.string().email().max(255).optional().or(z.literal("")),
  })
  .refine((data) => data.reference || data.phone || data.email, {
    message: "Provide a reference code, phone number, or email.",
  });

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit(`ticket_recover:${ip}`, 8, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds), "Cache-Control": "no-store" } }
    );
  }

  try {
    const { reference, phone, email } = recoverSchema.parse(await req.json());
    const identifier = (reference || phone || email || "").trim().toLowerCase();
    const identifierLimit = await rateLimit(`ticket_recover_identifier:${identifier}`, 5, 10 * 60 * 1000);
    if (!identifierLimit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    const conditions = [];
    if (reference) conditions.push(eq(orders.reference, reference.toUpperCase()));
    if (phone) conditions.push(like(orders.payerPhoneE164, `%${phone.replace(/\D/g, "").slice(-10)}`));
    if (email) conditions.push(eq(orders.payerEmail, email.toLowerCase()));

    const candidates = await db.query.orders.findMany({
      where: conditions.length === 1 ? conditions[0] : or(...conditions),
      limit: 5,
    });

    for (const order of candidates) {
      if (order.status !== "pending_payment") continue;
      try {
        const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
        if (!payment || payment.status === "completed" || payment.provider === "manual_transfer") continue;

        const provider = getPaymentProviderByName(payment.provider === "paypal" ? "paypal" : "paystack");
        const verification = await provider.verifyPayment(payment.providerRef);
        if (
          verification.isSuccessful &&
          !verification.isPending &&
          verification.amountMinor === order.totalMinor &&
          verification.currency === order.currency
        ) {
          await fulfillVerifiedPayment({
            orderId: order.id,
            provider: payment.provider === "paypal" ? "paypal" : "paystack",
            verification,
          });
        }
      } catch (error) {
        console.error("Ticket recovery reconciliation failed:", error);
      }
    }

    for (const candidate of candidates) {
      const currentOrder = await db.query.orders.findFirst({ where: (order, { eq }) => eq(order.id, candidate.id) });
      if (currentOrder?.status !== "paid") continue;

      const orderAttendees = await db.query.attendees.findMany({
        where: (attendee, { eq }) => eq(attendee.orderId, currentOrder.id),
      });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const accessToken = await createOrderAccessToken(currentOrder.id);
      for (const attendee of orderAttendees) {
        deliverTicket({
          attendeeName: attendee.name,
          refCode: currentOrder.reference,
          phoneE164: attendee.phoneE164,
          email: attendee.email || currentOrder.payerEmail,
          ticketUrl: `${appUrl}/ticket/${currentOrder.reference}?access=${encodeURIComponent(accessToken)}`,
        }).catch((error) => console.error("Ticket delivery failed:", error));
      }
    }

    return NextResponse.json(
      { success: true, message: "If a matching paid order exists, ticket delivery will be retried." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Provide a valid reference, phone, or email." }, { status: 422 });
    }
    console.error("Ticket recovery failed:", error);
    return NextResponse.json({ error: "Unable to process recovery request." }, { status: 500 });
  }
}
