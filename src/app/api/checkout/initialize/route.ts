import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders, attendees, groups, groupSeats, ticketTypes, ticketPrices } from "@/db/schema";
import { CURRENCIES, SupportedCurrency } from "@/config/currencies";
import { generateRefCode } from "@/lib/crypto/ref-code";
import { getPaymentProvider } from "@/lib/payments";

const registrationSchema = z.object({
  currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
  isGroup: z.boolean().default(false),
  // Payer / Leader info
  payerName: z.string().min(2, "Full name is required"),
  payerPhone: z.string().min(7, "Valid phone number is required"),
  payerEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  country: z.string().default("Nigeria"),
  state: z.string().optional(),
  parish: z.string().optional(),
  // Minor protection
  isMinor: z.boolean().default(false),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  // Group specific
  groupName: z.string().optional(),
  groupSeatsCount: z.number().int().min(1).max(500).default(1),
  // Attendee direct list (if group leader fills upfront, or single individual)
  attendeeList: z
    .array(
      z.object({
        name: z.string().min(2),
        phone: z.string().min(7),
        email: z.string().email().optional().or(z.literal("")),
        state: z.string().optional(),
        parish: z.string().optional(),
        isMinor: z.boolean().default(false),
        guardianName: z.string().optional(),
        guardianPhone: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registrationSchema.parse(body);

    const currencyConfig = CURRENCIES[validated.currency as SupportedCurrency];
    if (!currencyConfig) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    // PayPal requires payer email
    if (validated.currency !== "NGN" && (!validated.payerEmail || !validated.payerEmail.includes("@"))) {
      return NextResponse.json(
        { error: "A valid email address is required for international currency payments via PayPal." },
        { status: 400 }
      );
    }

    const seatsCount = validated.isGroup ? validated.groupSeatsCount : 1;
    const totalMinor = seatsCount * currencyConfig.standardPriceMinor;

    // Generate unique order reference (HGC-XXXXXX)
    const orderRef = generateRefCode();
    const idempotencyKey = `order_${orderRef}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute reservation timer

    // Find or seed standard ticket type
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

    // Wrap creation in database transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create Order
      const [order] = await tx
        .insert(orders)
        .values({
          reference: orderRef,
          status: "pending_payment",
          currency: validated.currency,
          totalMinor,
          feeMinor: 0,
          payerName: validated.payerName,
          payerPhoneE164: validated.payerPhone,
          payerEmail: validated.payerEmail || null,
          isGroup: validated.isGroup,
          groupName: validated.isGroup ? validated.groupName || validated.payerName : null,
          idempotencyKey,
          expiresAt,
        })
        .returning();

      let createdGroupId: string | null = null;

      // 2. If Group, create Group record
      if (validated.isGroup) {
        const mgmtToken = `grp_${generateRefCode()}_${Date.now()}`;
        const [grp] = await tx
          .insert(groups)
          .values({
            orderId: order.id,
            churchOrParishName: validated.groupName || validated.payerName,
            leaderName: validated.payerName,
            leaderPhoneE164: validated.payerPhone,
            leaderEmail: validated.payerEmail || null,
            totalSeats: seatsCount,
            claimedSeats: validated.attendeeList?.length || 1,
            managementToken: mgmtToken,
          })
          .returning();
        createdGroupId = grp.id;
      }

      // 3. Create Attendee records (unconfirmed until paid)
      const attendeesToInsert = [];
      const directAttendees = validated.attendeeList && validated.attendeeList.length > 0
        ? validated.attendeeList
        : [
            {
              name: validated.payerName,
              phone: validated.payerPhone,
              email: validated.payerEmail,
              state: validated.state,
              parish: validated.parish,
              isMinor: validated.isMinor,
              guardianName: validated.guardianName,
              guardianPhone: validated.guardianPhone,
            },
          ];

      for (let i = 0; i < seatsCount; i++) {
        const attendeeInfo = directAttendees[i] || {
          name: `Unclaimed Seat ${i + 1}`,
          phone: validated.payerPhone,
          email: null,
          state: validated.state,
          parish: validated.parish,
          isMinor: false,
          guardianName: null,
          guardianPhone: null,
        };

        const attendeeRef = generateRefCode();
        // Temporary placeholder hash until payment confirmed
        const tempHash = `temp_${attendeeRef}_${Date.now()}_${i}`;

        attendeesToInsert.push({
          orderId: order.id,
          groupId: createdGroupId,
          ticketTypeId: defaultTicketType.id,
          refCode: attendeeRef,
          name: attendeeInfo.name,
          phoneE164: attendeeInfo.phone,
          email: attendeeInfo.email || null,
          country: validated.country,
          state: attendeeInfo.state || validated.state || null,
          parish: attendeeInfo.parish || validated.parish || null,
          isMinor: attendeeInfo.isMinor || false,
          guardianName: attendeeInfo.guardianName || null,
          guardianPhoneE164: attendeeInfo.guardianPhone || null,
          status: "unconfirmed" as const,
          qrTokenHash: tempHash,
        });
      }

      const insertedAttendees = await tx.insert(attendees).values(attendeesToInsert).returning();

      // If group with unassigned seats, create invite seat codes
      if (validated.isGroup && createdGroupId) {
        const seatsRows = insertedAttendees.map((att, idx) => ({
          groupId: createdGroupId,
          inviteCode: `seat_${orderRef}_${idx + 1}`,
          attendeeId: att.id,
          isClaimed: idx < directAttendees.length,
          claimedAt: idx < directAttendees.length ? new Date() : null,
        }));
        await tx.insert(groupSeats).values(seatsRows);
      }

      return { order, insertedAttendees };
    });

    // 4. Initialize Payment Provider
    const provider = getPaymentProvider(validated.currency as SupportedCurrency);
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/status`;

    const session = await provider.initializeCheckout({
      orderId: result.order.id,
      orderReference: orderRef,
      amountMinor: totalMinor,
      currency: validated.currency as SupportedCurrency,
      payerName: validated.payerName,
      payerPhoneE164: validated.payerPhone,
      payerEmail: validated.payerEmail,
      callbackUrl,
    });

    return NextResponse.json({
      success: true,
      reference: orderRef,
      totalMinor,
      currency: validated.currency,
      checkoutUrl: session.checkoutUrl,
      providerRef: session.providerRef,
    });
  } catch (error: any) {
    console.error("Checkout initialize error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to initialize checkout session." },
      { status: 500 }
    );
  }
}
