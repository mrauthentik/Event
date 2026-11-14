import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, manualPayments, orders, payments } from "@/db/schema";
import { verifyOrderAccessToken } from "@/lib/crypto/ed25519";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

const schema = z.object({
  reference: z.string().trim().regex(/^HGC-[A-HJ-NP-Z2-9]{6}$/i),
  ticketAccess: z.string().min(32).max(1024),
  senderBank: z.string().trim().min(2).max(128),
  senderName: z.string().trim().min(2).max(128),
  transferReference: z.string().trim().min(3).max(128),
});

class SubmissionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const ip = clientIp(req);
  const limit = await rateLimit(`manual_transfer_submit:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many submissions. Wait a few minutes and retry." }, {
    status: 429,
    headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
  });

  try {
    const input = schema.parse(await req.json());
    const outcome = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders)
        .where(eq(orders.reference, input.reference.toUpperCase()))
        .for("update")
        .limit(1);
      if (!order || !(await verifyOrderAccessToken(input.ticketAccess, order.id))) {
        throw new SubmissionError("This payment link is invalid. Return to registration or contact the help desk.", 404);
      }
      if (order.status !== "pending_payment" || order.currency !== "NGN" || order.expiresAt && order.expiresAt.getTime() < Date.now()) {
        throw new SubmissionError("This order is no longer accepting a transfer submission.", 409);
      }

      const [manualPaymentRecord] = await tx.select().from(payments)
        .where(and(eq(payments.orderId, order.id), eq(payments.provider, "manual_transfer")))
        .limit(1);
      if (!manualPaymentRecord) throw new SubmissionError("Bank transfer is not the selected payment method for this order.", 409);

      const [existing] = await tx.select().from(manualPayments)
        .where(eq(manualPayments.orderId, order.id))
        .for("update")
        .limit(1);
      const now = new Date();
      const values = {
        bankName: input.senderBank,
        accountName: input.senderName,
        referenceOrTellerId: input.transferReference,
        amountMinor: order.totalMinor,
        status: "pending",
        reviewedByStaffId: null,
        adminNotes: null,
        updatedAt: now,
      };
      const [submission] = existing
        ? await tx.update(manualPayments).set(values).where(eq(manualPayments.id, existing.id)).returning()
        : await tx.insert(manualPayments).values({ orderId: order.id, ...values }).returning();

      await tx.insert(auditLog).values({
        action: "manual_transfer_submitted",
        entityType: "orders",
        entityId: order.id,
        oldState: existing ? { status: existing.status } : null,
        newState: { status: "pending", amountMinor: order.totalMinor, currency: order.currency },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });
      return { id: submission.id };
    });

    return NextResponse.json({ success: true, submissionId: outcome.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the transfer details and try again." }, { status: 422 });
    if (error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Manual transfer submission failed.");
    return NextResponse.json({ error: "The transfer submission could not be saved. Your order has not been marked as paid." }, { status: 500 });
  }
}
