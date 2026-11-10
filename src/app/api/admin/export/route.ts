import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendees, auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const allAttendees = await db.query.attendees.findMany({
      orderBy: [desc(attendees.createdAt)],
    });

    // 1. Audit log the export event (Section 12 requirement)
    await db.insert(auditLog).values({
      action: "export_attendees_csv",
      entityType: "attendees",
      entityId: "all",
      oldState: null,
      newState: { count: allAttendees.length, exportedAt: new Date().toISOString() },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
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

    const rows = allAttendees.map((a) => [
      `"${a.refCode}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.phoneE164}"`,
      `"${a.email || ""}"`,
      `"${a.country}"`,
      `"${a.state || ""}"`,
      `"${(a.parish || "").replace(/"/g, '""')}"`,
      `"${a.isMinor ? "Yes" : "No"}"`,
      `"${a.guardianName || ""}"`,
      `"${a.guardianPhoneE164 || ""}"`,
      `"${a.status}"`,
      `"${a.checkedInAt ? a.checkedInAt.toISOString() : ""}"`,
      `"${a.bookletIssuedAt ? a.bookletIssuedAt.toISOString() : ""}"`,
      `"${a.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ihgc-2026-attendees-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Failed to export CSV." }, { status: 500 });
  }
}

