import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

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

    const attendee = await db.query.attendees.findFirst({ where: eq(attendees.id, input.attendeeId) });
    if (!attendee || attendee.deletedAt) {
      return NextResponse.json({ error: "Attendee not found." }, { status: 404 });
    }

    const now = new Date();
    let nextStatus = attendee.status;
    let checkedInAt = attendee.checkedInAt;
    let bookletIssuedAt = attendee.bookletIssuedAt;

    if (input.action === "force_check_in") {
      if (attendee.status === "unconfirmed") {
        return NextResponse.json({ error: "Only confirmed attendees can be checked in." }, { status: 409 });
      }
      if (attendee.checkedInAt) return NextResponse.json({ error: "Attendee is already checked in." }, { status: 409 });
      nextStatus = "checked_in";
      checkedInAt = now;
    } else if (input.action === "issue_booklet") {
      if (!attendee.checkedInAt) return NextResponse.json({ error: "Check in the attendee before issuing a booklet." }, { status: 409 });
      if (attendee.bookletIssuedAt) return NextResponse.json({ error: "A booklet has already been issued." }, { status: 409 });
      nextStatus = "booklet_issued";
      bookletIssuedAt = now;
    } else {
      if (!attendee.checkedInAt) return NextResponse.json({ error: "Attendee is not checked in." }, { status: 409 });
      nextStatus = "confirmed";
      checkedInAt = null;
      bookletIssuedAt = null;
    }

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(attendees)
        .set({ status: nextStatus, checkedInAt, bookletIssuedAt, updatedAt: now })
        .where(and(eq(attendees.id, attendee.id), eq(attendees.status, attendee.status)))
        .returning({ id: attendees.id });
      if (!updated) throw new Error("Attendee state changed; retry the override.");

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
    });

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid override request." }, { status: 422 });
    }
    console.error("Scanner override failed:", error);
    return NextResponse.json({ error: "Override operation failed." }, { status: 409 });
  }
}
