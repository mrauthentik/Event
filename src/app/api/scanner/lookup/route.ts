import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees } from "@/db/schema";
import { or, eq, ilike } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const q = req.nextUrl.searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ attendee: null });
    }

    const cleanQuery = q.trim();

    const attendee = await db.query.attendees.findFirst({
      where: or(
        eq(attendees.refCode, cleanQuery.toUpperCase()),
        eq(attendees.phoneE164, cleanQuery),
        ilike(attendees.name, `%${cleanQuery}%`)
      ),
    });

    if (!attendee) {
      return NextResponse.json({ attendee: null });
    }

    return NextResponse.json({
      attendee: {
        id: attendee.id,
        refCode: attendee.refCode,
        name: attendee.name,
        phoneE164: attendee.phoneE164,
        country: attendee.country,
        state: attendee.state,
        parish: attendee.parish,
        status: attendee.status,
        checkedInAt: attendee.checkedInAt?.toISOString() || null,
        bookletIssuedAt: attendee.bookletIssuedAt?.toISOString() || null,
      },
    });
  } catch (err: any) {
    console.error("Lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

