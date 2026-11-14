import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { getPaymentProviderByName, paypal } from "@/lib/payments";
import { fulfillVerifiedPayment } from "@/lib/payments/fulfill-order";
import { verifyOrderAccessToken } from "@/lib/crypto/ed25519";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const rl = await rateLimit(`checkout_status:${clientIp(req)}:${ref}`, 60, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many status checks. Please wait a moment." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const order = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.reference, ref) });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404, headers: noStore });
    const ticketAccess = req.nextUrl.searchParams.get("ticket_access");
    if (!ticketAccess || !(await verifyOrderAccessToken(ticketAccess, order.id))) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: noStore });
    }

    if (order.status === "paid") {
      const orderAttendees = await db.query.attendees.findMany({
        where: (a, { eq }) => eq(a.orderId, order.id),
      });
      return NextResponse.json(
        {
          status: "paid",
          reference: order.reference,
          currency: order.currency,
          totalMinor: order.totalMinor,
          payerName: order.payerName,
          isGroup: order.isGroup,
          attendees: orderAttendees.map((attendee) => ({
            id: attendee.id,
            name: attendee.name,
            refCode: attendee.refCode,
            status: attendee.status,
          })),
        },
        { headers: noStore }
      );
    }

    if (order.status !== "pending_payment") {
      return NextResponse.json({ status: order.status, reference: order.reference }, { headers: noStore });
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    if (!payment) {
      return NextResponse.json(
        { status: "pending_payment", reference: order.reference, expiresAt: order.expiresAt },
        { headers: noStore }
      );
    }

    const provider = getPaymentProviderByName(payment.provider === "paypal" ? "paypal" : "paystack");
    const paypalToken = req.nextUrl.searchParams.get("paypal_token");
    const verification =
      payment.provider === "paypal" && paypalToken === payment.providerRef
        ? await paypal.captureOrder(payment.providerRef)
        : await provider.verifyPayment(payment.providerRef);

    if (
      verification.isSuccessful &&
      !verification.isPending &&
      verification.providerRef === payment.providerRef &&
      (payment.provider !== "paypal" || verification.orderReference === order.reference) &&
      (payment.provider !== "paypal" || Boolean(verification.captureId)) &&
      verification.amountMinor === order.totalMinor &&
      verification.currency === order.currency
    ) {
      const result = await fulfillVerifiedPayment({
        orderId: order.id,
        provider: payment.provider === "paypal" ? "paypal" : "paystack",
        verification,
      });

      const confirmed = result.fulfilled
        ? result.attendees
        : await db.query.attendees.findMany({ where: (a, { eq }) => eq(a.orderId, order.id) });
      return NextResponse.json(
        {
          status: "paid",
          reference: order.reference,
          currency: order.currency,
          totalMinor: order.totalMinor,
          payerName: order.payerName,
          isGroup: order.isGroup,
          attendees: confirmed.map((attendee) => ({
            id: attendee.id,
            name: attendee.name,
            refCode: attendee.refCode,
            status: attendee.status,
          })),
        },
        { headers: noStore }
      );
    }

    return NextResponse.json(
      { status: "pending_payment", reference: order.reference, expiresAt: order.expiresAt },
      { headers: noStore }
    );
  } catch (error) {
    console.error("Payment status verification failed:", error);
    return NextResponse.json(
      { error: "Unable to verify payment right now. Please try again shortly." },
      { status: 503, headers: noStore }
    );
  }
}
