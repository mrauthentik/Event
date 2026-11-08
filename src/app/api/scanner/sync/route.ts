import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { attendees, scanEvents, bookletStock } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { scans } = await req.json();

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json({ success: true, processedCount: 0 });
    }

    let processedCount = 0;
    let conflictsCount = 0;

    await db.transaction(async (tx) => {
      for (const scan of scans) {
        // 1. Check idempotency: has this specific scan idempotency key been processed?
        const existingScan = await tx.query.scanEvents.findFirst({
          where: eq(scanEvents.idempotencyKey, scan.idempotencyKey),
        });

        if (existingScan) {
          continue; // Already processed
        }

        const attendee = await tx.query.attendees.findFirst({
          where: eq(attendees.id, scan.attendeeId),
        });

        if (!attendee) {
          continue;
        }

        const clientTime = new Date(scan.clientTimestamp);

        if (scan.scanType === "arrival") {
          // If already checked in
          if (attendee.status === "checked_in" || attendee.status === "booklet_issued") {
            conflictsCount++;
            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "arrival",
              standId: scan.standId,
              clientTimestamp: clientTime,
              idempotencyKey: scan.idempotencyKey,
              result: "already_checked_in",
              notes: `Attempted scan at ${scan.standId} but attendee was already checked in at ${attendee.checkedInAt?.toISOString()}`,
            });
          } else {
            // Atomic check-in
            await tx
              .update(attendees)
              .set({
                status: "checked_in",
                checkedInAt: clientTime,
                updatedAt: new Date(),
              })
              .where(eq(attendees.id, attendee.id));

            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "arrival",
              standId: scan.standId,
              clientTimestamp: clientTime,
              idempotencyKey: scan.idempotencyKey,
              result: "valid",
              notes: `Checked in at stand ${scan.standId}`,
            });
            processedCount++;
          }
        } else if (scan.scanType === "booklet") {
          // Issue booklet
          await tx
            .update(attendees)
            .set({
              status: "booklet_issued",
              bookletIssuedAt: clientTime,
              updatedAt: new Date(),
            })
            .where(eq(attendees.id, attendee.id));

          await tx.insert(scanEvents).values({
            attendeeId: attendee.id,
            scanType: "booklet",
            standId: scan.standId,
            clientTimestamp: clientTime,
            idempotencyKey: scan.idempotencyKey,
            result: "valid",
            notes: `Booklet issued at stand ${scan.standId}`,
          });
          processedCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      processedCount,
      conflictsCount,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Scanner sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process scanner sync." },
      { status: 500 }
    );
  }
}

