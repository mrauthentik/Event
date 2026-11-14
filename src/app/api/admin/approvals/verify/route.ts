import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog, manualPayments, notificationJobs, orders, payments } from "@/db/schema";
import { createTicketToken, getTicketSigningKey } from "@/lib/crypto/ed25519";
import { clientIp } from "@/lib/rate-limit";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { buildTicketNotificationJobs } from "@/lib/messaging/outbox";

const approvalSchema = z.object({
  manualPaymentId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("finance");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const input = approvalSchema.parse({
      manualPaymentId: formData.get("manualPaymentId"),
      action: formData.get("action"),
    });
    const signingKey = input.action === "approve" ? getTicketSigningKey() : null;

    await db.transaction(async (tx) => {
      const [manual] = await tx.select().from(manualPayments)
        .where(and(eq(manualPayments.id, input.manualPaymentId), eq(manualPayments.status, "pending")))
        .limit(1);
      if (!manual) throw new Error("This payment has already been reviewed or does not exist.");

      const [order] = await tx.select().from(orders).where(eq(orders.id, manual.orderId)).limit(1);
      if (!order || order.status !== "pending_payment") {
        throw new Error("The order is no longer awaiting payment.");
      }

      if (input.action === "approve") {
        if (order.currency !== "NGN" || manual.amountMinor !== order.totalMinor) {
          throw new Error("Only an exact NGN payment can be approved. Review the bank statement and reject mismatches.");
        }
        if (order.expiresAt && order.expiresAt.getTime() < Date.now()) {
          throw new Error("This order has expired. Resolve the late payment through the documented finance procedure.");
        }

        const [claimed] = await tx.update(manualPayments)
          .set({ status: "approved", reviewedByStaffId: user.id, updatedAt: new Date() })
          .where(and(eq(manualPayments.id, manual.id), eq(manualPayments.status, "pending")))
          .returning({ id: manualPayments.id });
        if (!claimed) throw new Error("This payment has already been reviewed.");

        const [paidOrder] = await tx.update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")))
          .returning({ id: orders.id });
        if (!paidOrder) throw new Error("The order has already changed state.");

        await tx.insert(payments).values({
          orderId: order.id,
          provider: "manual_transfer",
          providerRef: `manual_${manual.id}`,
          providerCaptureId: manual.referenceOrTellerId,
          status: "completed",
          currency: order.currency,
          amountMinor: manual.amountMinor,
        });

        const orderAttendees = await tx.select().from(attendees).where(eq(attendees.orderId, order.id));
        const confirmed = [];
        for (const attendee of orderAttendees) {
          const { tokenHash } = await createTicketToken(attendee.id, signingKey!);
          const [saved] = await tx.update(attendees).set({
            status: "confirmed",
            qrTokenHash: tokenHash,
            updatedAt: new Date(),
          }).where(eq(attendees.id, attendee.id)).returning();
          confirmed.push(saved);
        }
        const jobs = await buildTicketNotificationJobs(order, confirmed);
        if (jobs.length) await tx.insert(notificationJobs).values(jobs).onConflictDoNothing();

        await tx.insert(auditLog).values({
          staffId: user.id,
          action: "approve_manual_bank_transfer",
          entityType: "orders",
          entityId: order.id,
          oldState: { status: order.status, paymentStatus: manual.status },
          newState: { status: "paid", paymentStatus: "approved", reference: order.reference },
          ipAddress: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        });
      } else {
        const [rejected] = await tx.update(manualPayments)
          .set({ status: "rejected", reviewedByStaffId: user.id, updatedAt: new Date() })
          .where(and(eq(manualPayments.id, manual.id), eq(manualPayments.status, "pending")))
          .returning({ id: manualPayments.id });
        if (!rejected) throw new Error("This payment has already been reviewed.");
        await tx.insert(auditLog).values({
          staffId: user.id,
          action: "reject_manual_bank_transfer",
          entityType: "orders",
          entityId: order.id,
          oldState: { status: order.status, paymentStatus: manual.status },
          newState: { status: order.status, paymentStatus: "rejected", reference: order.reference },
          ipAddress: clientIp(req),
          userAgent: req.headers.get("user-agent"),
        });
      }
    });

    return NextResponse.redirect(new URL("/admin/approvals", req.url), 303);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid manual payment and action are required." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
