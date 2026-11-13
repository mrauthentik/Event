import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees, auditLog, orders } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import { clientIp } from "@/lib/rate-limit";

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const allAttendees = await db
      .select({ attendee: attendees })
      .from(attendees)
      .innerJoin(orders, eq(attendees.orderId, orders.id))
      .where(and(eq(orders.status, "paid"), isNull(attendees.deletedAt)))
      .orderBy(desc(attendees.createdAt));

    // 1. Audit log the export event (Section 12 requirement)
    await db.insert(auditLog).values({
      action: "export_attendees_csv",
      entityType: "attendees",
      entityId: "all",
      oldState: null,
      newState: { count: allAttendees.length, exportedAt: new Date().toISOString() },
      staffId: user.id,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    // 2. Generate CSV
    const headers = [
      "Reference Code",
      "Full Name",
      "Phone Number",
      "Email Address",
      "Country",
      "State",
      "Parish",
      "Minor",
      "Guardian Name",
      "Guardian Phone",
      "Status",
      "Checked In At",
      "Booklet Issued At",
      "Created At",
    ];

    const rows = allAttendees.map(({ attendee: a }) => [
      a.refCode,
      a.name,
      a.phoneE164,
      a.email,
      a.country,
      a.state,
      a.parish,
      a.isMinor ? "Yes" : "No",
      a.guardianName,
      a.guardianPhoneE164,
      a.status,
      a.checkedInAt?.toISOString(),
      a.bookletIssuedAt?.toISOString(),
      a.createdAt.toISOString(),
    ].map(csvCell));

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ihgc-2026-attendees-${Date.now()}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Failed to export CSV." }, { status: 500 });
  }
}

