import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, webhookEvents } from "@/db/schema";
import { paystack } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 256 * 1024) return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > 256 * 1024) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }
  if (!(await paystack.verifyWebhookSignature(rawBody, req.headers))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

  const eventType = typeof payload?.event === "string" ? payload.event : "";
  const eventId = payload?.data?.id ? String(payload.data.id) : "";
  if (!/^[A-Z_a-z.]{1,64}$/.test(eventType) || !/^[A-Za-z0-9_-]{1,255}$/.test(eventId)) {
    return NextResponse.json({ error: "Webhook event identifier is missing." }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(webhookEvents)
      .values({
        provider: "paystack",
        eventType,
        providerEventId: eventId,
        payload: {
          id: eventId,
          event: eventType,
          data: {
            reference: typeof payload.data?.reference === "string" ? payload.data.reference.slice(0, 32) : null,
            status: typeof payload.data?.status === "string" ? payload.data.status.slice(0, 32) : null,
            amount: Number.isSafeInteger(payload.data?.amount) ? payload.data.amount : null,
            currency: typeof payload.data?.currency === "string" ? payload.data.currency.slice(0, 8) : null,
          },
        },
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

    await fulfillVerifiedPayment({
      orderId: order.id,
      provider: "paystack",
      verification,
      rawPayloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
    });
    await db.update(webhookEvents).set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.providerEventId, eventId));

    return NextResponse.json({ received: true });
  } catch (error) {
      console.error("Paystack webhook processing failed.");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
