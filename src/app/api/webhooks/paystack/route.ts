import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, webhookEvents } from "@/db/schema";
import { paystack } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!(await paystack.verifyWebhookSignature(rawBody, req.headers))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

  const eventType = payload?.event;
  const eventId = payload?.data?.id ? String(payload.data.id) : "";
  if (!eventType || !eventId) {
    return NextResponse.json({ error: "Webhook event identifier is missing." }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(webhookEvents)
      .values({
        provider: "paystack",
        eventType,
        providerEventId: eventId,
        payload,
        signatureValid: true,
        processed: false,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });

    if (!inserted) {
      const existing = await db.query.webhookEvents.findFirst({
        where: (event, { eq }) => eq(event.providerEventId, eventId),
      });
      if (existing?.processed) return NextResponse.json({ received: true, idempotent: true });
    }

    if (eventType !== "charge.success") {
      await db.update(webhookEvents).set({ processed: true, processedAt: new Date() })
        .where(eq(webhookEvents.providerEventId, eventId));
      return NextResponse.json({ received: true });
    }

    const reference = String(payload.data?.reference || "");
    const order = reference
      ? await db.query.orders.findFirst({ where: (candidate, { eq }) => eq(candidate.reference, reference) })
      : undefined;
    if (!order) {
      await db.update(webhookEvents).set({ processed: true, processedAt: new Date(), error: "Order not found." })
        .where(eq(webhookEvents.providerEventId, eventId));
      return NextResponse.json({ received: true });
    }

    // A valid webhook is only a notification; re-fetch the transaction from Paystack.
    const verification = await paystack.verifyPayment(reference);
    if (
      !verification.isSuccessful ||
      verification.isPending ||
      verification.providerRef !== reference ||
      verification.amountMinor !== order.totalMinor ||
      verification.currency !== order.currency
    ) {
      await db.update(webhookEvents).set({ processed: true, processedAt: new Date(), error: "Gateway verification did not match the order." })
        .where(eq(webhookEvents.providerEventId, eventId));
      return NextResponse.json({ received: true, ignored: true });
    }

    const result = await fulfillVerifiedPayment({
      orderId: order.id,
      provider: "paystack",
      verification,
      rawPayloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
    });
    await db.update(webhookEvents).set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.providerEventId, eventId));

    if (result.fulfilled) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const accessToken = await createOrderAccessToken(order.id);
      for (const attendee of result.attendees) {
        deliverTicket({
          attendeeName: attendee.name,
          refCode: attendee.refCode,
          phoneE164: attendee.phoneE164,
          email: attendee.email || order.payerEmail,
          ticketUrl: `${appUrl}/ticket/${order.reference}?access=${encodeURIComponent(accessToken)}`,
        }).catch((error) => console.error("Ticket delivery failed:", error));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
