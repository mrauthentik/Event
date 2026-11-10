import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, attendees, payments, scanEvents, ticketTypes } from "@/db/schema";
import { generateRefCode } from "@/lib/crypto/ref-code";
import { createTicketToken } from "@/lib/crypto/ed25519";
import { requireRole } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, phone, state, parish, paymentMethod, tellerOrReceipt, standId } =
      await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Attendee name and phone number are required." },
        { status: 400 }
      );
    }

    const orderRef = generateRefCode();
    const attendeeRef = generateRefCode();
    const now = new Date();
    const amountMinor = 500_000; // Flat ₦5,000 in kobo

    let defaultTicketType = await db.query.ticketTypes.findFirst({
      where: (t, { eq }) => eq(t.isActive, true),
    });

    if (!defaultTicketType) {
      const [inserted] = await db
        .insert(ticketTypes)
        .values({
          name: "Standard Registration",
          description: "All-access 4-day pass to IHGC 2026",
          isActive: true,
        })
        .returning();
      defaultTicketType = inserted;
    }

    const signingKey =
      process.env.TICKET_SIGNING_PRIVATE_KEY ||
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const result = await db.transaction(async (tx) => {
      // 1. Create Order as PAID
      const [order] = await tx
        .insert(orders)
        .values({
          reference: orderRef,
          status: "paid",
          currency: "NGN",
          totalMinor: amountMinor,
          feeMinor: 0,
          payerName: name,
          payerPhoneE164: phone,
          payerEmail: null,
          isGroup: false,
          idempotencyKey: `walkin_${orderRef}_${Date.now()}`,
          expiresAt: null,
        })
        .returning();

      // 2. Create Payment record
      await tx.insert(payments).values({
        orderId: order.id,
        provider: "manual_transfer",
        providerRef: `${paymentMethod.toUpperCase()}_${orderRef}`,
        providerCaptureId: tellerOrReceipt || "GATE_CASH",
        status: "completed",
        currency: "NGN",
        amountMinor,
        rawPayloadHash: null,
      });

      // 3. Create Attendee as CHECKED_IN
      // Generate temporary ID to sign
      const tempId = crypto.randomUUID();
      const { tokenHash } = await createTicketToken(tempId, signingKey);

      const [attendee] = await tx
        .insert(attendees)
        .values({
          id: tempId,
          orderId: order.id,
          ticketTypeId: defaultTicketType.id,
          refCode: attendeeRef,
          name,
          phoneE164: phone,
          country: "Nigeria",
          state: state || "FCT Abuja",
          parish: parish || null,
          status: "checked_in",
          qrTokenHash: tokenHash,
          checkedInAt: now,
        })
        .returning();

      // 4. Record Arrival Scan Event
      await tx.insert(scanEvents).values({
        attendeeId: attendee.id,
        scanType: "arrival",
        standId: standId || "Gate A",
        clientTimestamp: now,
        idempotencyKey: `walkin_scan_${attendee.id}_${Date.now()}`,
        result: "valid",
        notes: `Walk-in registration via ${paymentMethod}`,
      });

      return attendee;
    });

    return NextResponse.json({
      success: true,
      attendee: {
        id: result.id,
        refCode: result.refCode,
        name: result.name,
        phone: result.phoneE164,
        status: result.status,
      },
    });
  } catch (err: any) {
    console.error("Walk-in registration error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process walk-in." },
      { status: 500 }
    );
  }
}

