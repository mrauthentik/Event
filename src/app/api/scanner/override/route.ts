import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, auditLog, scanEvents } from "@/db/schema";

const SUPERVISOR_PIN = process.env.SUPERVISOR_PIN || "7788"; // Configurable supervisor PIN

export async function POST(req: NextRequest) {
  try {
    const { attendeeId, action, supervisorPin, reason, standId } = await req.json();

    if (supervisorPin !== SUPERVISOR_PIN) {
      return NextResponse.json({ error: "Invalid supervisor PIN." }, { status: 403 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { error: "A valid operational reason is required for manual override." },
        { status: 400 }
      );
    }

    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.id, attendeeId),
    });

    if (!attendee) {
      return NextResponse.json({ error: "Attendee not found." }, { status: 404 });
    }

    const now = new Date();

    if (action === "force_check_in") {
      await db
        .update(attendees)
        .set({
          status: "checked_in",
          checkedInAt: now,
          updatedAt: now,
        })
        .where(eq(attendees.id, attendeeId));

      await db.insert(auditLog).values({
        action: "supervisor_override_checkin",
        entityType: "attendees",
        entityId: attendeeId,
        oldState: { status: attendee.status },
        newState: { status: "checked_in", reason, standId },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json({ success: true, status: "checked_in" });
    }

    if (action === "issue_booklet") {
      await db
        .update(attendees)
        .set({
          status: "booklet_issued",
          bookletIssuedAt: now,
          updatedAt: now,
        })
        .where(eq(attendees.id, attendeeId));

      await db.insert(auditLog).values({
        action: "supervisor_override_booklet",
        entityType: "attendees",
        entityId: attendeeId,
        oldState: { bookletIssuedAt: attendee.bookletIssuedAt },
        newState: { status: "booklet_issued", reason, standId },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json({ success: true, status: "booklet_issued" });
    }

    if (action === "undo_check_in") {
      await db
        .update(attendees)
        .set({
          status: "confirmed",
          checkedInAt: null,
          bookletIssuedAt: null,
          updatedAt: now,
        })
        .where(eq(attendees.id, attendeeId));

      await db.insert(auditLog).values({
        action: "supervisor_undo_checkin",
        entityType: "attendees",
        entityId: attendeeId,
        oldState: { status: attendee.status, checkedInAt: attendee.checkedInAt },
        newState: { status: "confirmed", reason, standId },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json({ success: true, status: "confirmed" });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Override error:", error);
    return NextResponse.json(
      { error: error?.message || "Override operation failed." },
      { status: 500 }
    );
  }
}

