import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments, auditLog } from "@/db/schema";
import { createTicketToken } from "@/lib/crypto/ed25519";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const orderId = formData.get("orderId") as string;
    const action = formData.get("action") as string;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const signingKey =
      process.env.TICKET_SIGNING_PRIVATE_KEY ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    if (action === "approve") {
      await db.transaction(async (tx) => {
        // 1. Mark Order as Paid
        await tx
          .update(orders)
          .set({ status: "paid", updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        // 2. Insert Payment record
        await tx.insert(payments).values({
          orderId: order.id,
          provider: "manual_transfer",
          providerRef: `BANK_STATEMENT_${order.reference}`,
          providerCaptureId: "VERIFIED_ON_BANK_STATEMENT",
          status: "completed",
          currency: order.currency,
          amountMinor: order.totalMinor,
          rawPayloadHash: null,
        });

        // 3. Confirm Attendees & Issue Cryptographic Ed25519 Tokens
        const atts = await tx
          .select()
          .from(attendees)
          .where(eq(attendees.orderId, order.id));

        for (const att of atts) {
          const { tokenHash } = await createTicketToken(att.id, signingKey);
          await tx
            .update(attendees)
            .set({
              status: "confirmed",
              qrTokenHash: tokenHash,
              updatedAt: new Date(),
            })
            .where(eq(attendees.id, att.id));
        }

        // 4. Audit Log
        await tx.insert(auditLog).values({
          action: "approve_manual_bank_transfer",
          entityType: "orders",
          entityId: order.id,
          oldState: { status: order.status },
          newState: { status: "paid", reference: order.reference },
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent"),
        });
      });
    }

    return NextResponse.redirect(new URL("/admin/approvals", req.url));
  } catch (err: any) {
    console.error("Manual approval error:", err);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}

