import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { attendees, orders, payments } from "@/db/schema";
import { getPaymentProviderByName } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";
import { processNotificationQueue } from "@/lib/messaging/worker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { expired: 0, reconciled: 0, stillPending: 0, notificationClaimed: 0, notificationDelivered: 0, notificationRetried: 0, notificationDead: 0, errors: 0 };

  // Process the bounded notification batch before slower provider reconciliation calls.
  try {
    const queue = await processNotificationQueue();
    results.notificationClaimed = queue.claimed;
    results.notificationDelivered = queue.delivered;
    results.notificationRetried = queue.retried;
    results.notificationDead = queue.dead;
  } catch {
    console.error("[cron] ticket notification processing failed.");
    results.errors++;
  }

  try {
    const staleOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), lt(orders.expiresAt, new Date())))
      .limit(200);

    for (const order of staleOrders) {
      await db.transaction(async (tx) => {
        const [expired] = await tx
          .update(orders)
          .set({ status: "expired", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")))
          .returning({ id: orders.id });
        if (!expired) return;
        await tx.update(attendees)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)));
        results.expired++;
      });
    }
  } catch (error) {
    console.error("[cron] expiry failed:", error);
    results.errors++;
  }

  try {
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending_payment"))
      .limit(100);

    for (const order of pendingOrders) {
      try {
        const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
        if (!payment || payment.provider === "manual_transfer") continue;

        const provider = getPaymentProviderByName(payment.provider === "paypal" ? "paypal" : "paystack");
        const verification = await provider.verifyPayment(payment.providerRef);
        if (
          verification.isSuccessful &&
          !verification.isPending &&
          verification.amountMinor === order.totalMinor &&
          verification.currency === order.currency
        ) {
          const result = await fulfillVerifiedPayment({
            orderId: order.id,
            provider: payment.provider === "paypal" ? "paypal" : "paystack",
            verification,
          });
          if (!result.fulfilled) continue;

          results.reconciled++;
        } else if (verification.isPending) {
          results.stillPending++;
        }
      } catch (error) {
        console.error("[cron] payment reconciliation failed:", error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("[cron] reconciliation query failed:", error);
    results.errors++;
  }

  return NextResponse.json({ success: true, ...results, ranAt: new Date().toISOString() });
}
