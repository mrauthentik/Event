import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog, bookletStock, orders } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";
import { calendarDateInZone } from "@/lib/timezone";

const overrideSchema = z.object({
  attendeeId: z.string().uuid(),
  action: z.enum(["force_check_in", "issue_booklet", "undo_check_in"]),
  supervisorPin: z.string().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
  standId: z.string().trim().min(1).max(64),
});

function safeEqual(left: string, right: string): boolean {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("supervisor");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const rl = await rateLimit(`scanner_override:${user.id}:${ip}`, 8, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many override attempts." }, { status: 429 });
  }

  const configuredPin = process.env.SUPERVISOR_PIN;
  if (!configuredPin || configuredPin.length < 8) {
    return NextResponse.json({ error: "Supervisor override is not configured." }, { status: 503 });
  }

  try {
    const input = overrideSchema.parse(await req.json());
    if (!safeEqual(input.supervisorPin, configuredPin)) {
      return NextResponse.json({ error: "Invalid supervisor PIN." }, { status: 403 });
    }

    const now = new Date();
    const outcome = await db.transaction(async (tx) => {
      const [row] = await tx.select({ attendee: attendees, orderStatus: orders.status })
        .from(attendees)
        .innerJoin(orders, eq(attendees.orderId, orders.id))
        .where(eq(attendees.id, input.attendeeId))
        .for("update")
        .limit(1);
      const attendee = row?.attendee;
      if (!attendee || attendee.deletedAt) throw new Error("Attendee not found.");
      if (row.orderStatus !== "paid") throw new Error("Only paid attendees can receive a check-in override.");

      let nextStatus = attendee.status;
      let checkedInAt = attendee.checkedInAt;
      let bookletIssuedAt = attendee.bookletIssuedAt;
      let stockRow: typeof bookletStock.$inferSelect | undefined;

      if (input.action === "force_check_in") {
        if (attendee.status === "unconfirmed") throw new Error("Only confirmed attendees can be checked in.");
        if (attendee.checkedInAt) throw new Error("Attendee is already checked in.");
        nextStatus = "checked_in";
        checkedInAt = now;
      } else if (input.action === "issue_booklet") {
        if (!attendee.checkedInAt) throw new Error("Check in the attendee before issuing a booklet.");
        if (attendee.bookletIssuedAt) throw new Error("A booklet has already been issued.");
        const allocatedDate = calendarDateInZone(now, "Africa/Lagos");
        [stockRow] = await tx.select().from(bookletStock)
          .where(and(eq(bookletStock.standId, input.standId), eq(bookletStock.allocatedDate, allocatedDate)))
          .for("update").limit(1);
        if (!stockRow) throw new Error("No booklet allocation is configured for this stand today.");
        if (stockRow.allocatedQuantity - stockRow.issuedCount - stockRow.returnedCount <= 0) throw new Error("This stand has no booklets remaining today.");
        nextStatus = "booklet_issued";
        bookletIssuedAt = now;
      } else {
        if (!attendee.checkedInAt) throw new Error("Attendee is not checked in.");
        if (attendee.bookletIssuedAt) throw new Error("This attendee already received a physical booklet. Record the booklet return first; the check-in cannot be undone while the issued asset is still outstanding.");
        nextStatus = "confirmed";
        checkedInAt = null;
      }

      const [updated] = await tx.update(attendees)
        .set({ status: nextStatus, checkedInAt, bookletIssuedAt, updatedAt: now })
        .where(and(eq(attendees.id, attendee.id), eq(attendees.status, attendee.status), isNull(attendees.deletedAt)))
        .returning({ id: attendees.id });
      if (!updated) throw new Error("Attendee state changed; retry the override.");

      if (stockRow) {
        await tx.update(bookletStock).set({ issuedCount: stockRow.issuedCount + 1, updatedAt: now })
          .where(eq(bookletStock.id, stockRow.id));
      }

      await tx.insert(auditLog).values({
        staffId: user.id,
        action: `supervisor_${input.action}`,
        entityType: "attendees",
        entityId: attendee.id,
        oldState: { status: attendee.status, checkedInAt: attendee.checkedInAt, bookletIssuedAt: attendee.bookletIssuedAt },
        newState: { status: nextStatus, checkedInAt, bookletIssuedAt, reason: input.reason, standId: input.standId },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });
      return { status: nextStatus };
    });

    return NextResponse.json({ success: true, status: outcome.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid override request." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Override operation failed.";
    if (message === "Attendee not found.") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "Override operation failed.") console.error("Scanner override failed.");
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
