import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, webhookEvents } from "@/db/schema";
import { paypal } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > 256 * 1024) return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > 256 * 1024) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }
  if (!(await paypal.verifyWebhookSignature(rawBody, req.headers))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

  const eventType = typeof payload?.event_type === "string" ? payload.event_type : "";
  const eventId = typeof payload?.id === "string" ? payload.id : "";
  if (!/^[A-Z_.]{1,64}$/.test(eventType) || !/^[A-Za-z0-9_-]{1,255}$/.test(eventId)) {
    return NextResponse.json({ error: "Webhook event identifier is missing." }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(webhookEvents)
      .values({
        provider: "paypal",
        eventType,
        providerEventId: eventId,
        payload: {
          id: eventId,
          event_type: eventType,
          resource: {
            id: typeof payload.resource?.id === "string" ? payload.resource.id.slice(0, 255) : null,
            status: typeof payload.resource?.status === "string" ? payload.resource.status.slice(0, 32) : null,
            custom_id: typeof payload.resource?.custom_id === "string" ? payload.resource.custom_id.slice(0, 32) : null,
            invoice_id: typeof payload.resource?.invoice_id === "string" ? payload.resource.invoice_id.slice(0, 32) : null,
            supplementary_data: {
              related_ids: {
                order_id: typeof payload.resource?.supplementary_data?.related_ids?.order_id === "string"
                  ? payload.resource.supplementary_data.related_ids.order_id.slice(0, 255)
                  : null,
              },
            },
            amount: {
              value: typeof payload.resource?.amount?.value === "string" ? payload.resource.amount.value.slice(0, 32) : null,
              currency_code: typeof payload.resource?.amount?.currency_code === "string" ? payload.resource.amount.currency_code.slice(0, 8) : null,
            },
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

    if (eventType === "CUSTOMER.DISPUTE.CREATED") {
      const reference = String(payload.resource?.custom_id || payload.resource?.invoice_id || "");
      if (reference) {
        await db.update(orders).set({ disputed: true, updatedAt: new Date() })
          .where(eq(orders.reference, reference));
      }
    } else if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = payload.resource;
      const paypalOrderId = String(capture?.supplementary_data?.related_ids?.order_id || "");
      if (!paypalOrderId || !capture?.id) {
        await db.update(webhookEvents).set({ processed: true, processedAt: new Date(), error: "Capture is missing its PayPal order id." })
          .where(eq(webhookEvents.providerEventId, eventId));
        return NextResponse.json({ received: true, ignored: true });
      }

      // Re-fetch the order and capture from PayPal before issuing any ticket.
      const verification = await paypal.verifyPayment(paypalOrderId);
      if (
        !verification.isSuccessful ||
        verification.isPending ||
        verification.captureId !== String(capture.id) ||
        !verification.orderReference
      ) {
        await db.update(webhookEvents).set({ processed: true, processedAt: new Date(), error: "PayPal verification did not match the completed capture." })
          .where(eq(webhookEvents.providerEventId, eventId));
        return NextResponse.json({ received: true, ignored: true });
      }

      const order = await db.query.orders.findFirst({
        where: (candidate, { eq }) => eq(candidate.reference, verification.orderReference!),
      });
      if (!order || verification.amountMinor !== order.totalMinor || verification.currency !== order.currency) {
        await db.update(webhookEvents).set({ processed: true, processedAt: new Date(), error: "PayPal amount, currency, or order reference did not match." })
          .where(eq(webhookEvents.providerEventId, eventId));
        return NextResponse.json({ received: true, ignored: true });
      }

      await fulfillVerifiedPayment({
        orderId: order.id,
        provider: "paypal",
        verification,
        rawPayloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
      });
    }

    await db.update(webhookEvents).set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.providerEventId, eventId));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed.");
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
