import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groupSeats, attendees, groups, orders } from "@/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const claimSchema = z.object({
  inviteCode: z.string().min(4),
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  state: z.string().optional(),
  parish: z.string().optional(),
  isMinor: z.boolean().default(false),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

/**
 * POST /api/group/claim
 * A group member claims an unassigned seat using the invite code
 * shared by the group leader. Only works after the order is paid.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`group_claim:${ip}`, 15, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = claimSchema.parse(body);

    const seat = await db.query.groupSeats.findFirst({
      where: (s, { eq }) => eq(s.inviteCode, data.inviteCode.trim()),
    });

    if (!seat) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
    }
    if (seat.isClaimed) {
      return NextResponse.json({ error: "This seat has already been claimed." }, { status: 409 });
    }

    const group = await db.query.groups.findFirst({
      where: (g, { eq }) => eq(g.id, seat.groupId),
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const order = await db.query.orders.findFirst({
      where: (o, { eq }) => eq(o.id, group.orderId),
    });
    if (!order || order.status !== "paid") {
      return NextResponse.json(
        { error: "This group registration is not yet paid. Please ask your leader to complete payment first." },
        { status: 402 }
      );
    }

    // Claim the seat: update attendee details
    await db.transaction(async (tx) => {
      if (seat.attendeeId) {
        await tx
          .update(attendees)
          .set({
            name: data.name,
            phoneE164: data.phone,
            email: data.email || null,
            state: data.state || null,
            parish: data.parish || null,
            isMinor: data.isMinor,
            guardianName: data.guardianName || null,
            guardianPhoneE164: data.guardianPhone || null,
            updatedAt: new Date(),
          })
          .where(eq(attendees.id, seat.attendeeId));
      }

      await tx
        .update(groupSeats)
        .set({ isClaimed: true, claimedAt: new Date() })
        .where(eq(groupSeats.id, seat.id));

      // Recount claimed seats
      const allSeats = await tx.query.groupSeats.findMany({
        where: (s, { eq }) => eq(s.groupId, seat.groupId),
      });
      const claimedCount = allSeats.filter((s) => s.isClaimed || s.id === seat.id).length;
      await tx
        .update(groups)
        .set({ claimedSeats: claimedCount, updatedAt: new Date() })
        .where(eq(groups.id, seat.groupId));
    });

    return NextResponse.json({
      success: true,
      groupName: group.churchOrParishName,
      message: "Your seat has been claimed! Your ticket will be available at the conference.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors }, { status: 422 });
    }
    console.error("Group claim error:", error);
    return NextResponse.json({ error: "Failed to claim seat." }, { status: 500 });
  }
}
