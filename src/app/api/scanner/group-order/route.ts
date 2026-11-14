import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog, orders, scanEvents } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getTicketVerifyingKey, verifyGroupOrderToken } from "@/lib/crypto/ed25519";

const inputSchema = z.object({
  token: z.string().min(32).max(2048),
  standId: z.string().trim().min(1).max(64),
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const limit = await rateLimit(`scanner_group:${user.id}:${ip}`, 60, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many group scans. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  try {
    const input = inputSchema.parse(await req.json());
    const verified = await verifyGroupOrderToken(input.token, getTicketVerifyingKey());
    if (!verified.isValid) return NextResponse.json({ error: "Invalid group order QR." }, { status: 403 });
    const { orderId, attendeeCount, nonce } = verified.payload;
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.status, "paid"), eq(orders.isGroup, true)))
        .for("update")
        .limit(1);
      if (!order) throw new Error("Paid group order not found.");

      const orderAttendees = await tx.select().from(attendees)
        .where(and(eq(attendees.orderId, order.id), isNull(attendees.deletedAt)))
        .for("update");
      if (orderAttendees.length !== attendeeCount) {
        throw new Error("The group roster changed after this QR was issued. Refresh the group ticket and sync the scanner.");
      }

      let checkedInCount = 0;
      let alreadyCheckedInCount = 0;
      const roster = [];
      for (const attendee of orderAttendees) {
        const idempotencyKey = `group:${user.id}:${nonce}:${attendee.id}`;
        let current = attendee;
        if (attendee.status === "confirmed" && !attendee.checkedInAt) {
          const [updated] = await tx.update(attendees).set({
            status: "checked_in",
            checkedInAt: now,
            updatedAt: now,
          }).where(and(
            eq(attendees.id, attendee.id),
            eq(attendees.status, "confirmed"),
            isNull(attendees.checkedInAt),
            isNull(attendees.deletedAt),
          )).returning();
          if (!updated) throw new Error("A seat changed state during group check-in. Retry with a fresh scan.");
          current = updated;
          checkedInCount++;
        } else if (attendee.checkedInAt) {
          alreadyCheckedInCount++;
        } else {
          throw new Error("A group seat is not confirmed. Resolve it before checking in the group.");
        }

        await tx.insert(scanEvents).values({
          attendeeId: attendee.id,
          scanType: "arrival",
          staffId: user.id,
          standId: input.standId,
          clientTimestamp: now,
          idempotencyKey,
          result: attendee.checkedInAt ? "already_checked_in" : "valid",
          notes: "Group order QR check-in.",
        }).onConflictDoNothing();
        roster.push({
          attendeeId: current.id,
          refCode: current.refCode,
          name: current.name,
          status: current.status,
          checkedInAt: current.checkedInAt?.toISOString() ?? null,
        });
      }

      await tx.insert(auditLog).values({
        staffId: user.id,
        action: "group_order_checkin",
        entityType: "orders",
        entityId: order.id,
        oldState: { attendees: orderAttendees.length },
        newState: { checkedInCount, alreadyCheckedInCount, standId: input.standId },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });
      return { roster, checkedInCount, alreadyCheckedInCount };
    });

    return NextResponse.json({ success: true, ...result }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid group order request." }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Group check-in failed.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
