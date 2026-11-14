import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders, attendees, groups, groupSeats, ticketTypes, ticketPrices, eventSettings, providerRoutes, payments } from "@/db/schema";
import { eq, and, or, gt, isNull, sql } from "drizzle-orm";
import { CURRENCIES, SupportedCurrency } from "@/config/currencies";
import { generateRefCode } from "@/lib/crypto/ref-code";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";
import { getPaymentProviderByName } from "@/lib/payments";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import crypto from "node:crypto";

class CheckoutRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const isPhoneE164 = (value: string) => /^\+[1-9]\d{6,14}$/.test(value.replace(/[\s()-]/g, ""));
const normalizePhone = (value: string) => value.replace(/[\s()-]/g, "");

const registrationSchema = z.object({
  currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
  isGroup: z.boolean().default(false),
  // Payer / Leader info
  payerName: z.string().trim().min(2, "Full name is required").max(255),
  payerPhone: z.string().trim().min(7, "Valid phone number is required").max(32),
  payerEmail: z.string().trim().email("Valid email required").max(255).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(128).default("Nigeria"),
  state: z.string().trim().max(128).optional(),
  parish: z.string().trim().max(255).optional(),
  // Minor protection
  isMinor: z.boolean().default(false),
  guardianName: z.string().trim().max(255).optional(),
  guardianPhone: z.string().trim().max(32).optional(),
  // Group specific
  groupName: z.string().trim().max(255).optional(),
  groupSeatsCount: z.number().int().min(1).max(500).default(1),
  // Attendee direct list (if group leader fills upfront, or single individual)
  attendeeList: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(255),
        phone: z.string().trim().min(7).max(32),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        state: z.string().trim().max(128).optional(),
        parish: z.string().trim().max(255).optional(),
        isMinor: z.boolean().default(false),
        guardianName: z.string().trim().max(255).optional(),
        guardianPhone: z.string().trim().max(32).optional(),
      })
    )
    .max(500)
    .optional(),
  // Cloudflare Turnstile bot-protection token
  turnstileToken: z.string().max(4096).optional(),
  consent: z.literal(true, "Consent is required to register."),
}).superRefine((data, context) => {
  if (!isPhoneE164(data.payerPhone)) {
    context.addIssue({ code: "custom", path: ["payerPhone"], message: "Use an international phone number, including the country code." });
  }
  if (data.isMinor && (!data.guardianName || !data.guardianPhone || !isPhoneE164(data.guardianPhone))) {
    context.addIssue({ code: "custom", path: ["guardianName"], message: "A valid guardian name and international phone are required for a minor." });
  }
  if (data.guardianPhone && !isPhoneE164(data.guardianPhone)) {
    context.addIssue({ code: "custom", path: ["guardianPhone"], message: "Use an international guardian phone number." });
  }
  for (const [index, attendee] of (data.attendeeList || []).entries()) {
    if (!isPhoneE164(attendee.phone)) {
      context.addIssue({ code: "custom", path: ["attendeeList", index, "phone"], message: "Use an international phone number." });
    }
    if (attendee.isMinor && (!attendee.guardianName || !attendee.guardianPhone || !isPhoneE164(attendee.guardianPhone))) {
      context.addIssue({ code: "custom", path: ["attendeeList", index, "guardianName"], message: "A valid guardian name and phone are required for a minor." });
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 10 registration attempts per IP per 10 minutes
    const ip = clientIp(req);
    const rl = await rateLimit(`checkout_init:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > 1024 * 1024) {
      return NextResponse.json({ error: "Registration details are too large." }, { status: 413 });
    }
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1024 * 1024) {
      return NextResponse.json({ error: "Registration details are too large." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Registration details must be valid JSON." }, { status: 400 });
    }
    const validated = registrationSchema.parse(body);
    const requestKey = z.string().uuid().parse(req.headers.get("idempotency-key"));
    const payerPhone = normalizePhone(validated.payerPhone);
    const phoneLimit = await rateLimit(
      `checkout_phone:${payerPhone}`,
      5,
      10 * 60 * 1000
    );
    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: "Too many recent attempts for this phone number." }, { status: 429 });
    }

    // Bot protection: verify Cloudflare Turnstile token
    const turnstile = await verifyTurnstileToken(validated.turnstileToken, ip);
    if (!turnstile.success) {
      return NextResponse.json({ error: turnstile.error }, { status: 403 });
    }

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
    if (validated.attendeeList && validated.attendeeList.length > seatsCount) {
      return NextResponse.json({ error: "Attendee count exceeds the number of paid seats." }, { status: 422 });
    }

    // Generate unique order reference (HGC-XXXXXX)
    const orderRef = generateRefCode();
    const idempotencyKey = `checkout_${requestKey}`;
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

    const [configuredPrice] = await db
      .select({ amountMinor: ticketPrices.amountMinor })
      .from(ticketPrices)
      .where(and(eq(ticketPrices.ticketTypeId, defaultTicketType.id), eq(ticketPrices.currency, validated.currency)))
      .limit(1);
    const totalMinor = seatsCount * (configuredPrice?.amountMinor ?? currencyConfig.standardPriceMinor);

    const [providerRoute] = await db
      .select()
      .from(providerRoutes)
      .where(eq(providerRoutes.currency, validated.currency))
      .limit(1);
    if (providerRoute && !providerRoute.isEnabled) {
      return NextResponse.json({ error: "Checkout is temporarily unavailable for this currency." }, { status: 503 });
    }
    const selectedProvider = providerRoute?.primaryProvider ?? currencyConfig.defaultProvider;
    if (selectedProvider === "manual_transfer") {
      return NextResponse.json({ error: "Manual transfer checkout is not available yet." }, { status: 503 });
    }
    const provider = getPaymentProviderByName(selectedProvider);

    // Wrap creation in database transaction
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const [settings] = await tx.select().from(eventSettings).limit(1);
      if (!settings) throw new CheckoutRequestError("Registration is temporarily unavailable.", 503);

      const [existingOrder] = await tx.select().from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey)).limit(1);
      if (existingOrder) {
        if (existingOrder.status !== "pending_payment") {
          throw new CheckoutRequestError("This registration attempt has already been completed or expired. Start a new registration.", 409);
        }
        const existingAttendees = await tx.select().from(attendees).where(eq(attendees.orderId, existingOrder.id));
        if (
          existingOrder.currency !== validated.currency ||
          existingOrder.totalMinor !== totalMinor ||
          existingOrder.payerName !== validated.payerName ||
          existingOrder.payerPhoneE164 !== payerPhone ||
          existingOrder.payerEmail !== (validated.payerEmail || null) ||
          existingOrder.isGroup !== validated.isGroup ||
          existingAttendees.length !== seatsCount
        ) {
          throw new CheckoutRequestError("This idempotency key is already tied to different registration details.", 409);
        }
        return { order: existingOrder, insertedAttendees: existingAttendees, isRetry: true };
      }
      if (now > settings.registrationDeadline) {
        throw new CheckoutRequestError("Registration is closed.", 403);
      }
      let capacityLimit = settings.capacityLimit;
      if (capacityLimit !== null) {
        const [lockedSettings] = await tx.select().from(eventSettings)
          .where(eq(eventSettings.id, settings.id)).for("update").limit(1);
        if (!lockedSettings) throw new CheckoutRequestError("Registration is temporarily unavailable.", 503);
        if (now > lockedSettings.registrationDeadline) {
          throw new CheckoutRequestError("Registration is closed.", 403);
        }
        capacityLimit = lockedSettings.capacityLimit;
      }
      if (capacityLimit !== null) {
        const [liveOrders] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(attendees)
          .innerJoin(orders, eq(attendees.orderId, orders.id))
          .where(and(
            or(
              eq(orders.status, "paid"),
              and(eq(orders.status, "pending_payment"), gt(orders.expiresAt, now)),
            ),
            isNull(attendees.deletedAt),
          ));
        const held = liveOrders?.count ?? 0;
        if (held + seatsCount > capacityLimit) {
          const remaining = Math.max(0, capacityLimit - held);
          throw new CheckoutRequestError(`Registration capacity reached. Only ${remaining} seat(s) remain.`, 409);
        }
      }

      // 1. Create Order
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          reference: orderRef,
          status: "pending_payment",
          currency: validated.currency,
          totalMinor,
          feeMinor: 0,
          payerName: validated.payerName,
          payerPhoneE164: payerPhone,
          payerEmail: validated.payerEmail || null,
          isGroup: validated.isGroup,
          groupName: validated.isGroup ? validated.groupName || validated.payerName : null,
          idempotencyKey,
          expiresAt,
        })
        .onConflictDoNothing({ target: orders.idempotencyKey })
        .returning();
      if (!createdOrder) {
        const [retryOrder] = await tx.select().from(orders)
          .where(eq(orders.idempotencyKey, idempotencyKey)).limit(1);
        if (!retryOrder || retryOrder.status !== "pending_payment") {
          throw new CheckoutRequestError("This registration attempt could not be resumed.", 409);
        }
        const retryAttendees = await tx.select().from(attendees).where(eq(attendees.orderId, retryOrder.id));
        if (
          retryOrder.currency !== validated.currency ||
          retryOrder.totalMinor !== totalMinor ||
          retryOrder.payerName !== validated.payerName ||
          retryOrder.payerPhoneE164 !== payerPhone ||
          retryOrder.payerEmail !== (validated.payerEmail || null) ||
          retryOrder.isGroup !== validated.isGroup ||
          retryAttendees.length !== seatsCount
        ) {
          throw new CheckoutRequestError("This idempotency key is already tied to different registration details.", 409);
        }
        return { order: retryOrder, insertedAttendees: retryAttendees, isRetry: true };
      }
      const order = createdOrder;

      let createdGroupId: string | null = null;

      // 2. If Group, create Group record
      if (validated.isGroup) {
        const mgmtToken = crypto.randomBytes(32).toString("base64url");
        const [grp] = await tx
          .insert(groups)
          .values({
            orderId: order.id,
            churchOrParishName: validated.groupName || validated.payerName,
            leaderName: validated.payerName,
            leaderPhoneE164: payerPhone,
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
              phone: payerPhone,
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
          phone: payerPhone,
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
          phoneE164: normalizePhone(attendeeInfo.phone),
          email: attendeeInfo.email || null,
          country: validated.country,
          state: attendeeInfo.state || validated.state || null,
          parish: attendeeInfo.parish || validated.parish || null,
          isMinor: attendeeInfo.isMinor || false,
          guardianName: attendeeInfo.guardianName || null,
          guardianPhoneE164: attendeeInfo.guardianPhone ? normalizePhone(attendeeInfo.guardianPhone) : null,
          status: "unconfirmed" as const,
          qrTokenHash: tempHash,
        });
      }

      const insertedAttendees = await tx.insert(attendees).values(attendeesToInsert).returning();

      // If group with unassigned seats, create invite seat codes
      if (validated.isGroup && createdGroupId) {
        const seatsRows = insertedAttendees.map((att, idx) => ({
          groupId: createdGroupId,
          inviteCode: crypto.randomBytes(24).toString("base64url"),
          attendeeId: att.id,
          isClaimed: idx < directAttendees.length,
          claimedAt: idx < directAttendees.length ? new Date() : null,
        }));
        await tx.insert(groupSeats).values(seatsRows);
      }

      return { order, insertedAttendees, isRetry: false };
    });

    if (result.isRetry) {
      const [previousPayment] = await db.select().from(payments)
        .where(and(eq(payments.orderId, result.order.id), eq(payments.status, "initiated")))
        .orderBy(sql`${payments.createdAt} desc`).limit(1);
      if (previousPayment?.checkoutUrl) {
        return NextResponse.json({
          success: true,
          reference: result.order.reference,
          totalMinor: result.order.totalMinor,
          currency: result.order.currency,
          checkoutUrl: previousPayment.checkoutUrl,
        });
      }
    }

    // 4. Initialize Payment Provider
    const ticketAccessToken = await createOrderAccessToken(result.order.id);
    const callbackUrl = new URL("/payment/status", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    callbackUrl.searchParams.set("ticket_access", ticketAccessToken);

    const session = await provider.initializeCheckout({
      orderId: result.order.id,
      orderReference: orderRef,
      amountMinor: totalMinor,
      currency: validated.currency as SupportedCurrency,
      payerName: validated.payerName,
      payerPhoneE164: payerPhone,
      payerEmail: validated.payerEmail,
      callbackUrl: callbackUrl.toString(),
    });

    if (!session.checkoutUrl) throw new Error("Payment provider did not return a checkout URL.");
    const checkoutUrl = new URL(session.checkoutUrl, callbackUrl);
    const allowedCheckoutHosts = selectedProvider === "paystack"
      ? new Set(["checkout.paystack.com"])
      : new Set(["www.paypal.com", "www.sandbox.paypal.com"]);
    const localMockCheckout = process.env.MOCK_PAYMENTS === "true" &&
      process.env.NODE_ENV !== "production" &&
      checkoutUrl.origin === callbackUrl.origin &&
      checkoutUrl.pathname === "/payment/status";
    if (!localMockCheckout && (checkoutUrl.protocol !== "https:" || !allowedCheckoutHosts.has(checkoutUrl.hostname))) {
      throw new Error("Payment provider returned an invalid checkout URL.");
    }

    await db.insert(payments).values({
      orderId: result.order.id,
      provider: selectedProvider,
      providerRef: session.providerRef,
      status: "initiated",
      currency: validated.currency,
      amountMinor: totalMinor,
      checkoutUrl: checkoutUrl.toString(),
    });

    return NextResponse.json({
      success: true,
      reference: orderRef,
      totalMinor,
      currency: validated.currency,
      checkoutUrl: checkoutUrl.toString(),
    });
  } catch (error: any) {
    if (error instanceof CheckoutRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    console.error("Checkout initialization failed.");
    return NextResponse.json({ error: "Unable to start checkout right now. Please try again shortly." }, { status: 503 });
  }
}

