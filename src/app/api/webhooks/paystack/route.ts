import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments, webhookEvents } from "@/db/schema";
import { createTicketToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret";

    // 1. Verify HMAC SHA512 Signature
    if (signature && !secretKey.startsWith("sk_test_mock")) {
      const computedHash = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      if (computedHash !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const eventId = String(payload.data?.id || `evt_${Date.now()}`);

    // 2. Record Webhook Event for Idempotency
    const existing = await db.query.webhookEvents.findFirst({
      where: (e, { eq }) => eq(e.providerEventId, eventId),
    });

    if (existing && existing.processed) {
      // Already processed idempotently
      return NextResponse.json({ received: true, idempotent: true });
    }

    if (!existing) {
      await db.insert(webhookEvents).values({
        provider: "paystack",
        eventType,
        providerEventId: eventId,
        payload,
        signatureValid: true,
        processed: false,
      });
    }

    // 3. Process 'charge.success'
    if (eventType === "charge.success") {
      const tx = payload.data;
      const orderRef = tx.reference;
      const amountPaidMinor = tx.amount;

      const order = await db.query.orders.findFirst({
        where: (o, { eq }) => eq(o.reference, orderRef),
      });

      if (order && order.status !== "paid") {
        const signingKey = process.env.TICKET_SIGNING_SECRET || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        await db.transaction(async (txDb) => {
          // Transition order to paid
          await txDb
            .update(orders)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(orders.id, order.id));

          // Log payment
          await txDb.insert(payments).values({
            orderId: order.id,
            provider: "paystack",
            providerRef: tx.reference,
            providerCaptureId: String(tx.id),
            status: "completed",
            currency: "NGN",
            amountMinor: amountPaidMinor,
            rawPayloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
          });

          // Confirm attendees & issue Ed25519 tokens
          const atts = await txDb
            .select()
            .from(attendees)
            .where(eq(attendees.orderId, order.id));

          for (const att of atts) {
            const { tokenHash } = await createTicketToken(att.id, signingKey);
            await txDb
              .update(attendees)
              .set({
                status: "confirmed",
                qrTokenHash: tokenHash,
                updatedAt: new Date(),
              })
              .where(eq(attendees.id, att.id));
          }

          // Mark webhook event processed
          await txDb
            .update(webhookEvents)
            .set({ processed: true, processedAt: new Date() })
            .where(eq(webhookEvents.providerEventId, eventId));

          // Queue ticket delivery (SMS primary, email if provided) — non-blocking
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          for (const att of atts) {
            deliverTicket({
              attendeeName: att.name,
              refCode: order.reference,
              phoneE164: att.phoneE164,
              email: att.email || order.payerEmail,
              ticketUrl: `${appUrl}/ticket/${order.reference}`,
            }).catch((err) => console.error("Ticket delivery failed:", err));
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed." },
      { status: 500 }
    );
  }
}

