import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog, eventSettings, notificationJobs, orders, payments, scanEvents, ticketPrices, ticketTypes } from "@/db/schema";
import { CURRENCIES } from "@/config/currencies";
import { generateRefCode } from "@/lib/crypto/ref-code";
import { createOrderAccessToken, createTicketToken, getTicketSigningKey } from "@/lib/crypto/ed25519";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { buildTicketNotificationJobs } from "@/lib/messaging/outbox";

const walkInSchema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(7).max(32),
  state: z.string().trim().max(128).optional(),
  parish: z.string().trim().max(255).optional(),
  paymentMethod: z.enum(["cash", "pos"]),
  tellerOrReceipt: z.string().trim().max(128).optional(),
  standId: z.string().trim().min(1).max(64),
}).superRefine((value, context) => {
  const normalizedPhone = value.phone.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
    context.addIssue({ code: "custom", path: ["phone"], message: "Use a valid international phone number." });
  }
  if (value.paymentMethod === "pos" && (!value.tellerOrReceipt || value.tellerOrReceipt.length < 3)) {
    context.addIssue({ code: "custom", path: ["tellerOrReceipt"], message: "Enter the POS RRN or approval code." });
  }
});

export async function GET() {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = await db.query.ticketTypes.findFirst({ where: (row, { eq }) => eq(row.isActive, true) });
  const [price] = type
    ? await db.select({ amountMinor: ticketPrices.amountMinor })
        .from(ticketPrices)
        .where(and(eq(ticketPrices.ticketTypeId, type.id), eq(ticketPrices.currency, "NGN")))
        .limit(1)
    : [];
  return NextResponse.json({ amountMinor: price?.amountMinor ?? CURRENCIES.NGN.standardPriceMinor, currency: "NGN" }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const limit = await rateLimit(`walkin:${user.id}:${ip}`, 60, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many walk-in registrations. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  try {
    const input = walkInSchema.parse(await req.json());
    const phone = input.phone.replace(/[\s()-]/g, "");
    if (input.paymentMethod === "pos" && !input.tellerOrReceipt) {
      return NextResponse.json({ error: "Enter the POS RRN or approval code." }, { status: 422 });
    }
    const signingKey = getTicketSigningKey();
    const scopedIdempotencyKey = `walkin:${user.id}:${input.idempotencyKey}`;
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const [settings] = await tx.select().from(eventSettings).limit(1);
      if (settings && now > settings.registrationDeadline) {
        throw new Error("Registration is closed.");
      }

      let ticketType = await tx.query.ticketTypes.findFirst({ where: (type, { eq }) => eq(type.isActive, true) });
      if (!ticketType) {
        const [createdType] = await tx.insert(ticketTypes).values({
          name: "Standard Registration",
          description: "All-access 4-day pass to IHGC 2026",
          isActive: true,
        }).returning();
        ticketType = createdType;
      }
      const [price] = await tx.select({ amountMinor: ticketPrices.amountMinor })
        .from(ticketPrices)
        .where(and(eq(ticketPrices.ticketTypeId, ticketType.id), eq(ticketPrices.currency, "NGN")))
        .limit(1);
      const amountMinor = price?.amountMinor ?? CURRENCIES.NGN.standardPriceMinor;
      const orderReference = generateRefCode();

      const [order] = await tx.insert(orders).values({
        reference: orderReference,
        status: "paid",
        currency: "NGN",
        totalMinor: amountMinor,
        feeMinor: 0,
        payerName: input.name,
        payerPhoneE164: phone,
        payerEmail: null,
        isGroup: false,
        idempotencyKey: scopedIdempotencyKey,
        expiresAt: null,
      }).onConflictDoNothing({ target: orders.idempotencyKey }).returning();

      if (!order) {
        const [existingOrder] = await tx.select().from(orders)
          .where(eq(orders.idempotencyKey, scopedIdempotencyKey)).limit(1);
        if (!existingOrder) throw new Error("The walk-in request could not be safely retried.");
        const [existingAttendee] = await tx.select().from(attendees)
          .where(eq(attendees.orderId, existingOrder.id)).limit(1);
        if (!existingAttendee) throw new Error("The existing walk-in record is incomplete. Contact an administrator.");
        return { order: existingOrder, attendee: existingAttendee };
      }

      const paymentReference = `WALKIN_${input.idempotencyKey}`;
      await tx.insert(payments).values({
        orderId: order.id,
        provider: "manual_transfer",
        providerRef: paymentReference,
        providerCaptureId: input.tellerOrReceipt || "CASH_COLLECTED_AT_GATE",
        status: "completed",
        currency: "NGN",
        amountMinor,
        rawPayloadHash: null,
      });

      const attendeeId = crypto.randomUUID();
      const { tokenHash } = await createTicketToken(attendeeId, signingKey);
      const [attendee] = await tx.insert(attendees).values({
        id: attendeeId,
        orderId: order.id,
        ticketTypeId: ticketType.id,
        refCode: generateRefCode(),
        name: input.name,
        phoneE164: phone,
        country: "Nigeria",
        state: input.state || "FCT Abuja",
        parish: input.parish || null,
        status: "checked_in",
        qrTokenHash: tokenHash,
        checkedInAt: now,
      }).returning();

      await tx.insert(scanEvents).values({
        attendeeId: attendee.id,
        scanType: "arrival",
        staffId: user.id,
        standId: input.standId,
        clientTimestamp: now,
        idempotencyKey: `walkin_scan_${input.idempotencyKey}`,
        result: "valid",
        notes: `Walk-in registration paid by ${input.paymentMethod.toUpperCase()}`,
      });

      const jobs = await buildTicketNotificationJobs(order, [attendee], {
        appUrl: process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV !== "production" ? req.nextUrl.origin : undefined),
      });
      if (jobs.length) await tx.insert(notificationJobs).values(jobs).onConflictDoNothing();

      await tx.insert(auditLog).values({
        staffId: user.id,
        action: "walkin_registration_and_checkin",
        entityType: "orders",
        entityId: order.id,
        oldState: null,
        newState: {
          reference: order.reference,
          amountMinor,
          currency: "NGN",
          paymentMethod: input.paymentMethod,
          attendeeId: attendee.id,
        },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });

      return { order, attendee };
    });

    const accessToken = await createOrderAccessToken(result.order.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const ticketUrl = `${appUrl}/ticket/${result.order.reference}?access=${encodeURIComponent(accessToken)}`;
    return NextResponse.json({
      success: true,
      ticketUrl,
      amountMinor: result.order.totalMinor,
      attendee: {
        id: result.attendee.id,
        refCode: result.attendee.refCode,
        name: result.attendee.name,
        status: result.attendee.status,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the name, international phone number, payment method, and POS reference." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Failed to process walk-in.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
