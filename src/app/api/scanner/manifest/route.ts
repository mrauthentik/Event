import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees } from "@/db/schema";
import { gt, and, ne } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const searchParams = req.nextUrl.searchParams;
    const sinceParam = searchParams.get("since");

    let queryConditions = ne(attendees.status, "unconfirmed");

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        queryConditions = and(queryConditions, gt(attendees.updatedAt, sinceDate))!;
      }
    }

    const attendeeList = await db.query.attendees.findMany({
      where: queryConditions,
      columns: {
        id: true,
        refCode: true,
        name: true,
        parish: true,
        status: true,
        qrTokenHash: true,
        checkedInAt: true,
        bookletIssuedAt: true,
        updatedAt: true,
      },
    });

    const verifyingSecret =
      process.env.NEXT_PUBLIC_TICKET_VERIFYING_SECRET ||
      // Fallback matching dev signing secret
      "dev-insecure-ticket-secret";

    return NextResponse.json({
      serverTimestamp: new Date().toISOString(),
      verifyingSecret,
      count: attendeeList.length,
      attendees: attendeeList.map((a) => ({
        tokenHash: a.qrTokenHash,
        attendeeId: a.id,
        refCode: a.refCode,
        name: a.name,
        parish: a.parish,
        status: a.status,
        checkedInAt: a.checkedInAt ? a.checkedInAt.toISOString() : null,
        bookletIssuedAt: a.bookletIssuedAt ? a.bookletIssuedAt.toISOString() : null,
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Scanner manifest sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate scanner manifest." },
      { status: 500 }
    );
  }
}

