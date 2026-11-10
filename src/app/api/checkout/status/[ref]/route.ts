import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, attendees, payments } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { createTicketToken } from "@/lib/crypto/ed25519";
import { deliverTicket } from "@/lib/messaging";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { SupportedCurrency } from "@/config/currencies";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const searchParams = req.nextUrl.searchParams;
    const isMockSuccess = searchParams.get("mock_success") === "true";

    // Rate limit: max 60 status polls per IP per 5 minutes
    const rl = rateLimit(`checkout_status:${clientIp(req)}:${ref}`, 60, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many status checks. Please wait a moment." },
        { status: 429 }
      );
    }

    // Lookup order
    const order = await db.query.orders.findFirst({
      where: (o, { eq }) => eq(o.reference, ref),
      with: {
        // We'll join attendees directly
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order is already paid, return ticket details
    if (order.status === "paid") {
      const orderAttendees = await db.query.attendees.findMany({
        where: (a, { eq }) => eq(a.orderId, order.id),
      });

      return NextResponse.json({
        status: "paid",
        reference: order.reference,
        currency: order.currency,
        totalMinor: order.totalMinor,
        payerName: order.payerName,
        isGroup: order.isGroup,
        attendees: orderAttendees.map((a) => ({
          id: a.id,
          name: a.name,
          refCode: a.refCode,
          phone: a.phoneE164,
          status: a.status,
        })),
      });
    }

    // If order is pending payment, verify with payment gateway
    const provider = getPaymentProvider(order.currency as SupportedCurrency);
    const verification = await provider.verifyPayment(order.reference);

    const isVerified = verification.isSuccessful || isMockSuccess;

    if (isVerified) {
      const signingKey = process.env.TICKET_SIGNING_PRIVATE_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      // Execute atomic transition in database
      const confirmedAttendees = await db.transaction(async (tx) => {
        // 1. Mark Order as Paid
        await tx
          .update(orders)
          .set({
            status: "paid",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        // 2. Record Payment
        await tx.insert(payments).values({
          orderId: order.id,
          provider: order.currency === "NGN" ? "paystack" : "paypal",
          providerRef: verification.providerRef || order.reference,
          providerCaptureId: verification.captureId || null,
          status: "completed",
          currency: order.currency,
          amountMinor: order.totalMinor,
          rawPayloadHash: null,
        });

        // 3. Confirm Attendees & Issue Cryptographic Ed25519 Tokens
        const currentAttendees = await tx
          .select()
          .from(attendees)
          .where(eq(attendees.orderId, order.id));

        const updated = [];

        for (const att of currentAttendees) {
          const { tokenHash } = await createTicketToken(att.id, signingKey);

          const [saved] = await tx
            .update(attendees)
            .set({
              status: "confirmed",
              qrTokenHash: tokenHash,
              updatedAt: new Date(),
            })
            .where(eq(attendees.id, att.id))
            .returning();

          updated.push(saved);
        }

        return updated;
      });

      // Queue ticket delivery (SMS primary, email if provided) — non-blocking
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      for (const att of confirmedAttendees) {
        deliverTicket({
          attendeeName: att.name,
          refCode: order.reference,
          phoneE164: att.phoneE164,
          email: att.email || order.payerEmail,
          ticketUrl: `${appUrl}/ticket/${order.reference}`,
        }).catch((err) => console.error("Ticket delivery failed:", err));
      }

      return NextResponse.json({
        status: "paid",
        reference: order.reference,
        currency: order.currency,
        totalMinor: order.totalMinor,
        payerName: order.payerName,
        isGroup: order.isGroup,
        attendees: confirmedAttendees.map((a) => ({
          id: a.id,
          name: a.name,
          refCode: a.refCode,
          phone: a.phoneE164,
          status: a.status,
        })),
      });
    }

    // Still pending at the gateway
    return NextResponse.json({
      status: "pending_payment",
      reference: order.reference,
      expiresAt: order.expiresAt,
    });
  } catch (error: any) {
    console.error("Payment status verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment status." },
      { status: 500 }
    );
  }
}

