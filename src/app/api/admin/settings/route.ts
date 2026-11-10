import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventSettings, providerRoutes, ticketTypes, ticketPrices } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

const settingsSchema = z.object({
  eventName: z.string().min(2).optional(),
  theme: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueMapUrl: z.string().url().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  capacityLimit: z.number().int().positive().nullable().optional(),
  capacityAlertThresholds: z.string().optional(),
});

const routesSchema = z.array(
  z.object({
    currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
    primaryProvider: z.enum(["paystack", "paypal", "manual_transfer"]),
    isEnabled: z.boolean(),
    feePolicy: z.enum(["organizer_absorbs", "pass_to_customer"]),
  })
);

const pricesSchema = z.array(
  z.object({
    currency: z.enum(["NGN", "USD", "EUR", "GBP"]),
    amountMinor: z.number().int().positive(),
  })
);

export async function GET() {
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [settings] = await db.select().from(eventSettings).limit(1);
    const routes = await db.select().from(providerRoutes);
    const types = await db.select().from(ticketTypes);
    const prices = await db.select().from(ticketPrices);

    return NextResponse.json({ settings, routes, ticketTypes: types, prices });
  } catch (error: any) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    // Event settings
    if (body.settings) {
      const s = settingsSchema.parse(body.settings);
      const [existing] = await db.select().from(eventSettings).limit(1);
      const update: any = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(s)) {
        if (v !== undefined) {
          if (k === "startsAt" || k === "endsAt" || k === "registrationDeadline") {
            update[k] = v ? new Date(v as string) : null;
          } else if (k === "capacityLimit") {
            update[k] = v === null ? null : v;
          } else if (k === "contactEmail") {
            update[k] = v || null;
          } else {
            update[k] = v;
          }
        }
      }
      if (existing) {
        await db.update(eventSettings).set(update).where(eq(eventSettings.id, existing.id));
      } else {
        await db.insert(eventSettings).values({
          startsAt: new Date("2026-12-08T16:00:00+01:00"),
          endsAt: new Date("2026-12-11T23:59:59+01:00"),
          registrationDeadline: new Date("2026-12-11T23:59:59+01:00"),
          ...update,
        });
      }
    }

    // Provider routes
    if (body.routes) {
      const routes = routesSchema.parse(body.routes);
      for (const r of routes) {
        await db
          .insert(providerRoutes)
          .values({ ...r, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: providerRoutes.currency,
            set: { ...r, updatedAt: new Date() },
          });
      }
    }

    // Ticket prices
    if (body.prices) {
      const prices = pricesSchema.parse(body.prices);
      const [defaultType] = await db.select().from(ticketTypes).limit(1);
      if (defaultType) {
        for (const p of prices) {
          await db
            .insert(ticketPrices)
            .values({
              ticketTypeId: defaultType.id,
              currency: p.currency,
              amountMinor: p.amountMinor,
              updatedAt: new Date(),
            })
            .onConflictDoNothing();
          // Update existing row if present
          await db
            .update(ticketPrices)
            .set({ amountMinor: p.amountMinor, updatedAt: new Date() })
            .where(eq(ticketPrices.currency, p.currency));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 422 });
    }
    console.error("Admin settings PUT error:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
