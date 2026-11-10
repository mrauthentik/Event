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
    const payload = JSON.parse(rawBody);

    const eventType = payload.event_type;
    const eventId = payload.id || `paypal_evt_${Date.now()}`;

    // Record Webhook Event for Idempotency
    const existing = await db.query.webhookEvents.findFirst({
      where: (e, { eq }) => eq(e.providerEventId, eventId),
    });

    if (existing && existing.processed) {
      return NextResponse.json({ received: true, idempotent: true });
    }

    if (!existing) {
      await db.insert(webhookEvents).values({
        provider: "paypal",
        eventType,
        providerEventId: eventId,
        payload,
        signatureValid: true,
        processed: false,
      });
    }

    // Handle Payment Capture Completed
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = payload.resource;
      const orderRef = capture.custom_id || capture.invoice_id || capture.purchase_units?.[0]?.reference_id;

      if (orderRef) {
        const order = await db.query.orders.findFirst({
          where: (o, { eq }) => eq(o.reference, orderRef),
        });

        if (order && order.status !== "paid") {
          const signingKey = process.env.TICKET_SIGNING_PRIVATE_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
          const amountValue = parseFloat(capture.amount?.value || "0");
          const amountMinor = Math.round(amountValue * 100);

          await db.transaction(async (txDb) => {
            await txDb
              .update(orders)
              .set({ status: "paid", updatedAt: new Date() })
              .where(eq(orders.id, order.id));

            await txDb.insert(payments).values({
              orderId: order.id,
              provider: "paypal",
              providerRef: capture.id,
              providerCaptureId: capture.id,
              status: "completed",
              currency: capture.amount?.currency_code || "USD",
              amountMinor,
              rawPayloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
            });

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
    }

    // Handle Dispute / Chargeback created
    if (eventType === "CUSTOMER.DISPUTE.CREATED") {
      // Flag order as disputed in admin, do not auto-delete tickets
      const dispute = payload.resource;
      const customId = dispute.custom_id;
      if (customId) {
        await db
          .update(orders)
          .set({ disputed: true, updatedAt: new Date() })
          .where(eq(orders.reference, customId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed." },
      { status: 500 }
    );
  }
}

