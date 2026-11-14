import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, bookletStock } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";

const allocationSchema = z.object({
  standId: z.string().trim().min(2).max(64),
  allocatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  allocatedQuantity: z.number().int().min(0).max(100_000),
});

const returnSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100_000),
  reason: z.string().trim().min(3).max(300),
});

class StockConflict extends Error {}

async function authorize(req: NextRequest) {
  if (!isSameOriginRequest(req)) return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  const user = await requireRole("admin");
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const ip = clientIp(req);
  const limit = await rateLimit(`admin_booklet_stock:${user.id}:${ip}`, 30, 5 * 60 * 1000);
  if (!limit.allowed) return { response: NextResponse.json({ error: "Too many stock changes. Try again shortly." }, {
    status: 429,
    headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
  }) };
  return { user, ip };
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;

  try {
    const input = allocationSchema.parse(await req.json());
    const now = new Date();
    const stock = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookletStock)
        .where(and(eq(bookletStock.standId, input.standId), eq(bookletStock.allocatedDate, input.allocatedDate)))
        .for("update")
        .limit(1);

      if (current && input.allocatedQuantity < current.issuedCount + current.returnedCount) {
        throw new StockConflict("The allocation cannot be lower than booklets already issued or returned.");
      }

      const [saved] = current
        ? await tx.update(bookletStock).set({ allocatedQuantity: input.allocatedQuantity, updatedAt: now })
          .where(eq(bookletStock.id, current.id)).returning()
        : await tx.insert(bookletStock).values({
          standId: input.standId,
          allocatedDate: input.allocatedDate,
          allocatedQuantity: input.allocatedQuantity,
          updatedAt: now,
        }).returning();

      await tx.insert(auditLog).values({
        staffId: auth.user.id,
        action: current ? "booklet_stock_allocation_updated" : "booklet_stock_allocation_created",
        entityType: "booklet_stock",
        entityId: saved.id,
        oldState: current ? { allocatedQuantity: current.allocatedQuantity, issuedCount: current.issuedCount, returnedCount: current.returnedCount } : null,
        newState: { standId: saved.standId, allocatedDate: saved.allocatedDate, allocatedQuantity: saved.allocatedQuantity },
        ipAddress: auth.ip === "unknown" ? null : auth.ip,
        userAgent: req.headers.get("user-agent"),
      });
      return saved;
    });

    return NextResponse.json({ stock }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid stand, conference date, and booklet quantity." }, { status: 422 });
    if (error instanceof StockConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    if ((error as { code?: string })?.code === "23505") return NextResponse.json({ error: "This stand and date were updated at the same time. Reload the page and retry." }, { status: 409 });
    console.error("Booklet allocation update failed.");
    return NextResponse.json({ error: "Booklet allocation could not be saved." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;

  try {
    const input = returnSchema.parse(await req.json());
    const now = new Date();
    const stock = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookletStock).where(eq(bookletStock.id, input.id)).for("update").limit(1);
      if (!current) throw new StockConflict("That stand allocation no longer exists. Reload the page.");
      const remaining = current.allocatedQuantity - current.issuedCount - current.returnedCount;
      if (input.quantity > remaining) throw new StockConflict(`Only ${remaining} unissued booklet(s) can be returned from this stand.`);

      const [saved] = await tx.update(bookletStock).set({
        returnedCount: current.returnedCount + input.quantity,
        updatedAt: now,
      }).where(eq(bookletStock.id, current.id)).returning();

      await tx.insert(auditLog).values({
        staffId: auth.user.id,
        action: "booklet_stock_return_recorded",
        entityType: "booklet_stock",
        entityId: saved.id,
        oldState: { returnedCount: current.returnedCount, remaining },
        newState: { returnedCount: saved.returnedCount, quantity: input.quantity, reason: input.reason, remaining: saved.allocatedQuantity - saved.issuedCount - saved.returnedCount },
        ipAddress: auth.ip === "unknown" ? null : auth.ip,
        userAgent: req.headers.get("user-agent"),
      });
      return saved;
    });

    return NextResponse.json({ stock }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid return quantity and reason." }, { status: 422 });
    if (error instanceof StockConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Booklet stock return failed.");
    return NextResponse.json({ error: "Returned booklets could not be recorded." }, { status: 500 });
  }
}
