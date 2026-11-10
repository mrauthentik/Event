import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, groupSeats, attendees, orders } from "@/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/group/dashboard/[token]
 * Group leader dashboard data: seat status, claimed members,
 * and per-seat invite links for unclaimed seats.
 * Token is the group's managementToken (unguessable).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = clientIp(req);
  const rl = rateLimit(`group_dash:${ip}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const { token } = await params;

    const group = await db.query.groups.findFirst({
      where: (g, { eq }) => eq(g.managementToken, token),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const order = await db.query.orders.findFirst({
      where: (o, { eq }) => eq(o.id, group.orderId),
    });

    const seats = await db.query.groupSeats.findMany({
      where: (s, { eq }) => eq(s.groupId, group.id),
    });

    const seatDetails = await Promise.all(
      seats.map(async (seat) => {
        let attendee = null;
        if (seat.attendeeId) {
          const [found] = await db
            .select()
            .from(attendees)
            .where(eq(attendees.id, seat.attendeeId))
            .limit(1);
          attendee = found || null;
        }
        return {
          inviteCode: seat.inviteCode,
          isClaimed: seat.isClaimed,
          claimedAt: seat.claimedAt,
          attendee: attendee
            ? {
                id: attendee.id,
                name: attendee.name,
                phone: attendee.phoneE164,
                refCode: attendee.refCode,
                status: attendee.status,
              }
            : null,
        };
      })
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.churchOrParishName,
        leaderName: group.leaderName,
        totalSeats: group.totalSeats,
        claimedSeats: group.claimedSeats,
      },
      order: order
        ? {
            reference: order.reference,
            status: order.status,
            currency: order.currency,
            ticketUrl: `${appUrl}/ticket/${order.reference}`,
          }
        : null,
      seats: seatDetails.map((s) => ({
        ...s,
        inviteUrl: `${appUrl}/group/claim/${s.inviteCode}`,
      })),
    });
  } catch (error: any) {
    console.error("Group dashboard error:", error);
    return NextResponse.json({ error: "Failed to load group dashboard." }, { status: 500 });
  }
}
