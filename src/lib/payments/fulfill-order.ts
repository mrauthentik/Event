import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attendees, notificationJobs, orders, payments } from "@/db/schema";
import { createTicketToken, getTicketSigningKey } from "@/lib/crypto/ed25519";
import { buildTicketNotificationJobs } from "@/lib/messaging/outbox";
import type { VerifyPaymentResult } from "./provider.interface";

type ProviderName = "paystack" | "paypal";

/** Confirms a payment only after the provider has been queried and its amount checked. */
export async function fulfillVerifiedPayment(input: {
  orderId: string;
  provider: ProviderName;
  verification: VerifyPaymentResult;
  rawPayloadHash?: string | null;
}): Promise<{ fulfilled: boolean; attendees: (typeof attendees.$inferSelect)[] }> {
  const { verification } = input;
  if (!verification.isSuccessful || verification.isPending) {
    throw new Error("Payment is not complete at the gateway.");
  }

  const signingKey = getTicketSigningKey();
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order was not found.");
    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
    if (!payment || payment.provider !== input.provider || payment.providerRef !== verification.providerRef) {
      throw new Error("Gateway reference does not match the order payment.");
    }
    if (verification.orderReference && verification.orderReference !== order.reference) {
      throw new Error("Gateway order reference does not match the local order.");
    }
    if (input.provider === "paypal" && !verification.captureId) {
      throw new Error("PayPal did not return a completed capture id.");
    }
    if (verification.amountMinor !== order.totalMinor || verification.currency !== order.currency) {
      throw new Error("Gateway amount or currency does not match the order.");
    }

    const [transitioned] = await tx
      .update(orders)
      .set({ status: "paid", updatedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (!transitioned) return { fulfilled: false, attendees: [] };

    const paymentValues = {
      provider: input.provider,
      providerRef: verification.providerRef,
      providerCaptureId: verification.captureId ?? null,
      status: "completed" as const,
      currency: verification.currency,
      amountMinor: verification.amountMinor,
      rawPayloadHash: input.rawPayloadHash ?? null,
      updatedAt: new Date(),
    };
    await tx.update(payments).set(paymentValues).where(eq(payments.id, payment.id));

    const orderAttendees = await tx
      .select()
      .from(attendees)
      .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)));
    const confirmed = [];
    for (const attendee of orderAttendees) {
      const { tokenHash } = await createTicketToken(attendee.id, signingKey);
      const [saved] = await tx
        .update(attendees)
        .set({ status: "confirmed", qrTokenHash: tokenHash, updatedAt: new Date() })
        .where(eq(attendees.id, attendee.id))
        .returning();
      confirmed.push(saved);
    }

    const jobs = await buildTicketNotificationJobs(order, confirmed);
    if (jobs.length) await tx.insert(notificationJobs).values(jobs).onConflictDoNothing();

    return { fulfilled: true, attendees: confirmed };
  });
}
