import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, orders, scanEvents } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const scanSchema = z.object({
  attendeeId: z.string().uuid(),
  scanType: z.enum(["arrival", "booklet"]),
  standId: z.string().trim().min(1).max(64),
  clientTimestamp: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  idempotencyKey: z.string().min(16).max(80),
});
const syncSchema = z.object({ scans: z.array(scanSchema).min(1).max(500) });

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const limit = await rateLimit(`scanner_sync:${user.id}:${ip}`, 120, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many scanner sync requests. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  try {
    const { scans } = syncSchema.parse(await req.json());
    const now = new Date();
    const parsed = scans.map((scan) => ({ ...scan, clientTime: new Date(scan.clientTimestamp) }));
    if (parsed.some((scan) =>
      scan.clientTime.getTime() > now.getTime() + 2 * 60 * 1000 ||
      scan.clientTime.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000
    )) {
      return NextResponse.json({ error: "A scan timestamp is outside the accepted time window." }, { status: 422 });
    }

    let processedCount = 0;
    let conflictsCount = 0;
    let rejectedCount = 0;

    await db.transaction(async (tx) => {
      for (const scan of parsed) {
        const idempotencyKey = `${user.id}:${scan.idempotencyKey}`;
        const [existing] = await tx.select({ id: scanEvents.id })
          .from(scanEvents)
          .where(eq(scanEvents.idempotencyKey, idempotencyKey))
          .limit(1);
        if (existing) continue;

        const [record] = await tx
          .select({ attendee: attendees, orderStatus: orders.status })
          .from(attendees)
          .innerJoin(orders, eq(attendees.orderId, orders.id))
          .where(eq(attendees.id, scan.attendeeId))
          .for("update")
          .limit(1);

        const attendee = record?.attendee;
        if (!attendee || attendee.deletedAt || record.orderStatus !== "paid") {
          rejectedCount++;
          continue;
        }

        if (scan.scanType === "arrival") {
          if (attendee.status === "unconfirmed") {
            rejectedCount++;
            continue;
          }

          const firstArrivalAt = attendee.checkedInAt;
          if (!firstArrivalAt || scan.clientTime < firstArrivalAt) {
            const [updated] = await tx.update(attendees).set({
              status: attendee.bookletIssuedAt ? "booklet_issued" : "checked_in",
              checkedInAt: scan.clientTime,
              updatedAt: now,
            }).where(and(
              eq(attendees.id, attendee.id),
              firstArrivalAt ? eq(attendees.checkedInAt, firstArrivalAt) : isNull(attendees.checkedInAt)
            ))
              .returning({ id: attendees.id });
            if (!updated) throw new Error("Concurrent scan update; retry sync.");

            if (firstArrivalAt) {
              await tx.update(scanEvents).set({
                result: "conflict",
                notes: "An earlier offline arrival timestamp was synchronized later.",
              }).where(and(
                eq(scanEvents.attendeeId, attendee.id),
                eq(scanEvents.scanType, "arrival"),
                eq(scanEvents.result, "valid"),
                gt(scanEvents.clientTimestamp, scan.clientTime)
              ));
            }

            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "arrival",
              staffId: user.id,
              standId: scan.standId,
              clientTimestamp: scan.clientTime,
              idempotencyKey,
              result: "valid",
              notes: "Arrival synchronized from an offline scanner.",
            });
            processedCount++;
          } else {
            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "arrival",
              staffId: user.id,
              standId: scan.standId,
              clientTimestamp: scan.clientTime,
              idempotencyKey,
              result: "conflict",
              notes: "A prior arrival was recorded with an earlier timestamp.",
            });
            conflictsCount++;
          }
        } else {
          if (!attendee.checkedInAt || attendee.bookletIssuedAt || scan.clientTime < attendee.checkedInAt) {
            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "booklet",
              staffId: user.id,
              standId: scan.standId,
              clientTimestamp: scan.clientTime,
              idempotencyKey,
              result: "conflict",
              notes: attendee.bookletIssuedAt
                ? "Booklet issue was already recorded."
                : !attendee.checkedInAt
                  ? "Booklet cannot be issued before check-in."
                  : "Booklet timestamp precedes the attendee arrival timestamp.",
            });
            conflictsCount++;
            continue;
          }

          const [updated] = await tx.update(attendees).set({
            status: "booklet_issued",
            bookletIssuedAt: scan.clientTime,
            updatedAt: now,
          }).where(and(
            eq(attendees.id, attendee.id),
            isNull(attendees.bookletIssuedAt),
            isNotNull(attendees.checkedInAt)
          )).returning({ id: attendees.id });
          if (!updated) throw new Error("Concurrent booklet update; retry sync.");

          await tx.insert(scanEvents).values({
            attendeeId: attendee.id,
            scanType: "booklet",
            staffId: user.id,
            standId: scan.standId,
            clientTimestamp: scan.clientTime,
            idempotencyKey,
            result: "valid",
            notes: "Booklet issuance synchronized from an offline scanner.",
          });
          processedCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      processedCount,
      conflictsCount,
      rejectedCount,
      serverTimestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid scan sync payload." }, { status: 422 });
    }
    console.error("Scanner sync failed:", error);
    return NextResponse.json({ error: "Failed to process scanner sync." }, { status: 500 });
  }
}
