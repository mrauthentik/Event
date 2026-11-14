import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, notificationJobs } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { clientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await requireRole("admin");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const jobId = z.string().uuid().parse(id);
    await db.transaction(async (tx) => {
      const [retried] = await tx.update(notificationJobs).set({
        status: "queued",
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        lastError: null,
        updatedAt: new Date(),
      }).where(and(eq(notificationJobs.id, jobId), eq(notificationJobs.status, "dead")))
        .returning({ id: notificationJobs.id, orderId: notificationJobs.orderId });
      if (!retried) throw new Error("Message job was not found or is no longer failed.");
      await tx.insert(auditLog).values({
        staffId: user.id,
        action: "retry_ticket_notification",
        entityType: "notification_jobs",
        entityId: retried.id,
        oldState: { status: "dead" },
        newState: { status: "queued", attempts: 0, orderId: retried.orderId },
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
    });
    return NextResponse.redirect(new URL("/admin/messaging?retried=1", req.url), 303);
  } catch (error) {
    const status = error instanceof z.ZodError ? 422 : 409;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to retry message." }, { status });
  }
}
