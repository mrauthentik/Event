import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, attendees, groupSeats, groups, orders } from "@/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

const claimSchema = z.object({
  inviteCode: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  name: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(7).max(32),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  state: z.string().trim().max(128).optional(),
  parish: z.string().trim().max(255).optional(),
  isMinor: z.boolean().default(false),
  guardianName: z.string().trim().max(255).optional(),
  guardianPhone: z.string().trim().max(32).optional(),
}).superRefine((data, context) => {
  if (!/^\+[1-9]\d{6,14}$/.test(data.phone.replace(/[\s()-]/g, ""))) {
    context.addIssue({ code: "custom", path: ["phone"], message: "Use an international phone number." });
  }
  if (data.isMinor && (!data.guardianName || !data.guardianPhone)) {
    context.addIssue({ code: "custom", path: ["guardianName"], message: "A guardian name and phone are required for a minor." });
  }
  if (data.guardianPhone && !/^\+[1-9]\d{6,14}$/.test(data.guardianPhone.replace(/[\s()-]/g, ""))) {
    context.addIssue({ code: "custom", path: ["guardianPhone"], message: "Use an international guardian phone number." });
  }
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const ip = clientIp(req);
  const limit = await rateLimit(`group_claim:${ip}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  try {
    const data = claimSchema.parse(await req.json());
    const inviteCode = data.inviteCode.trim();
    const identifierLimit = await rateLimit(`group_claim_code:${inviteCode}`, 5, 10 * 60 * 1000);
    if (!identifierLimit.allowed) {
      return NextResponse.json({ error: "This invite cannot be claimed right now." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }
    const phone = data.phone.replace(/[\s()-]/g, "");
    const guardianPhone = data.guardianPhone?.replace(/[\s()-]/g, "") || null;

    const result = await db.transaction(async (tx) => {
      const [seatSnapshot] = await tx.select().from(groupSeats)
        .where(eq(groupSeats.inviteCode, inviteCode)).limit(1);
      if (!seatSnapshot) throw new Error("Invalid invite code.");

      // Serialize claims within a group, so claimed-seat counts cannot race.
      const [group] = await tx.select().from(groups)
        .where(eq(groups.id, seatSnapshot.groupId)).for("update").limit(1);
      if (!group) throw new Error("Group not found.");
      const [seat] = await tx.select().from(groupSeats)
        .where(and(eq(groupSeats.id, seatSnapshot.id), eq(groupSeats.groupId, group.id)))
        .for("update").limit(1);
      if (!seat || seat.isClaimed || !seat.attendeeId) throw new Error("This seat has already been claimed or is unavailable.");

      const [order] = await tx.select().from(orders).where(eq(orders.id, group.orderId)).limit(1);
      if (!order || order.status !== "paid") throw new Error("This group registration is not yet paid.");

      const [updatedAttendee] = await tx.update(attendees).set({
        name: data.name,
        phoneE164: phone,
        email: data.email?.toLowerCase() || null,
        state: data.state || null,
        parish: data.parish || null,
        isMinor: data.isMinor,
        guardianName: data.isMinor ? data.guardianName || null : null,
        guardianPhoneE164: data.isMinor ? guardianPhone : null,
        updatedAt: new Date(),
      }).where(and(
        eq(attendees.id, seat.attendeeId),
        eq(attendees.orderId, order.id),
        isNull(attendees.deletedAt),
      )).returning({ id: attendees.id });
      if (!updatedAttendee) throw new Error("This seat is no longer available.");

      const [claimedSeat] = await tx.update(groupSeats).set({ isClaimed: true, claimedAt: new Date() })
        .where(and(eq(groupSeats.id, seat.id), eq(groupSeats.isClaimed, false)))
        .returning({ id: groupSeats.id });
      if (!claimedSeat) throw new Error("This seat has already been claimed.");

      const allSeats = await tx.select({ isClaimed: groupSeats.isClaimed }).from(groupSeats)
        .where(eq(groupSeats.groupId, group.id));
      const claimedCount = allSeats.filter((row) => row.isClaimed).length;
      await tx.update(groups).set({ claimedSeats: claimedCount, updatedAt: new Date() })
        .where(eq(groups.id, group.id));
      await tx.insert(auditLog).values({
        action: "group_seat_claimed",
        entityType: "group_seats",
        entityId: seat.id,
        oldState: { isClaimed: false },
        newState: { isClaimed: true, attendeeId: updatedAttendee.id },
        ipAddress: ip === "unknown" ? null : ip,
        userAgent: req.headers.get("user-agent"),
      });

      return { groupName: group.churchOrParishName };
    });

    return NextResponse.json({
      success: true,
      groupName: result.groupName,
      message: "Your seat has been claimed. Your ticket is available through the group leader.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the invite code, contact details, and guardian details." }, { status: 422, headers: { "Cache-Control": "no-store" } });
    }
    const message = error instanceof Error ? error.message : "Failed to claim seat.";
    const status = message === "Invalid invite code." ? 404 : 409;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
