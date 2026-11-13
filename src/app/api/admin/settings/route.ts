import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, eventSettings, providerRoutes, ticketTypes, ticketPrices } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { clientIp } from "@/lib/rate-limit";

const validDate = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Invalid date");
const thresholds = z.string().max(255).refine((value) => {
  if (!value.trim()) return true;
  const values = value.split(",").map((part) => Number(part.trim()));
  return values.every((number) => Number.isSafeInteger(number) && number > 0) &&
    values.every((number, index) => index === 0 || number > values[index - 1]);
}, "Use increasing positive integer thresholds separated by commas.");

const settingsSchema = z.object({
  eventName: z.string().trim().min(2).max(255).optional(),
  theme: z.string().trim().max(255).optional(),
  startsAt: validDate.optional(),
  endsAt: validDate.optional(),
  registrationDeadline: validDate.optional(),
  venueName: z.string().trim().max(255).optional(),
  venueAddress: z.string().trim().max(2000).optional(),
  venueMapUrl: z.string().url().max(2048).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional(),
  contactEmail: z.string().email().max(255).optional().or(z.literal("")),
  capacityLimit: z.number().int().positive().nullable().optional(),
  capacityAlertThresholds: thresholds.optional(),
});

const routesSchema = z.array(
  z.object({
    currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
    primaryProvider: z.enum(["paystack", "paypal", "manual_transfer"]),
    isEnabled: z.boolean(),
    feePolicy: z.enum(["organizer_absorbs", "pass_to_customer"]),
  })
).refine((routes) => new Set(routes.map((route) => route.currency)).size === routes.length, "Currencies must be unique.");

const pricesSchema = z.array(
  z.object({
    currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
    amountMinor: z.number().int().positive(),
  })
).refine((prices) => new Set(prices.map((price) => price.currency)).size === prices.length, "Currencies must be unique.");

const updateSchema = z.object({
  settings: settingsSchema.optional(),
  routes: routesSchema.optional(),
  prices: pricesSchema.optional(),
}).strict();

export async function GET() {
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [settings] = await db.select().from(eventSettings).limit(1);
    const routes = await db.select().from(providerRoutes);
    const types = await db.select().from(ticketTypes);
    const prices = await db.select().from(ticketPrices);

    return NextResponse.json({ settings, routes, ticketTypes: types, prices }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = updateSchema.parse(await req.json());

    await db.transaction(async (tx) => {
      const [beforeSettings] = await tx.select().from(eventSettings).limit(1);
      const beforeRoutes = await tx.select().from(providerRoutes);
      const beforePrices = await tx.select().from(ticketPrices);

      if (body.settings) {
        const [existing] = await tx.select().from(eventSettings).limit(1);
        const update: Record<string, unknown> = { updatedAt: new Date() };
        for (const [key, value] of Object.entries(body.settings)) {
          if (value === undefined) continue;
          if (key === "startsAt" || key === "endsAt" || key === "registrationDeadline") {
            update[key] = new Date(value as string);
          } else if (key === "contactEmail") {
            update[key] = value || null;
          } else {
            update[key] = value;
          }
        }
        if (existing) {
          await tx.update(eventSettings).set(update).where(eq(eventSettings.id, existing.id));
        } else {
          await tx.insert(eventSettings).values({
            startsAt: new Date("2026-12-08T16:00:00+01:00"),
            endsAt: new Date("2026-12-11T23:59:59+01:00"),
            registrationDeadline: new Date("2026-12-11T23:59:59+01:00"),
            ...update,
          } as typeof eventSettings.$inferInsert);
        }
      }

      for (const route of body.routes ?? []) {
        await tx.insert(providerRoutes)
          .values({ ...route, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: providerRoutes.currency,
            set: { ...route, updatedAt: new Date() },
          });
      }

      if (body.prices?.length) {
        const [defaultType] = await tx.select().from(ticketTypes).limit(1);
        if (!defaultType) throw new Error("No active ticket type is configured.");
        for (const price of body.prices) {
          await tx.insert(ticketPrices)
            .values({
              ticketTypeId: defaultType.id,
              currency: price.currency,
              amountMinor: price.amountMinor,
              updatedAt: new Date(),
            })
            .onConflictDoNothing();
          await tx.update(ticketPrices)
            .set({ amountMinor: price.amountMinor, updatedAt: new Date() })
            .where(and(eq(ticketPrices.ticketTypeId, defaultType.id), eq(ticketPrices.currency, price.currency)));
        }
      }

      const [afterSettings] = await tx.select().from(eventSettings).limit(1);
      const afterRoutes = await tx.select().from(providerRoutes);
      const afterPrices = await tx.select().from(ticketPrices);
      await tx.insert(auditLog).values({
        staffId: user.id,
        action: "admin_settings_updated",
        entityType: "event_configuration",
        entityId: afterSettings?.id || "global",
        oldState: { settings: beforeSettings ?? null, routes: beforeRoutes, prices: beforePrices },
        newState: { settings: afterSettings ?? null, routes: afterRoutes, prices: afterPrices },
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 422 });
    }
    console.error("Admin settings PUT error:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
