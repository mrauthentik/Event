import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, auditLog, bookletStock, orders, scanEvents } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/security/origin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTicketProof } from "@/lib/scanner/ticket-proof";
import { getTicketVerifyingKey, verifyGroupOrderToken } from "@/lib/crypto/ed25519";
import { calendarDateInZone } from "@/lib/timezone";

const scanSchema = z.object({
  attendeeId: z.string().uuid(),
  scanType: z.enum(["arrival", "booklet"]),
  standId: z.string().trim().min(1).max(64),
  clientTimestamp: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  idempotencyKey: z.string().min(16).max(128),
  ticketToken: z.string().trim().min(32).max(4096).optional(),
  groupOrderToken: z.string().trim().min(32).max(4096).optional(),
});
const syncSchema = z.object({ scans: z.array(scanSchema).min(1).max(100) });

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
    const publicKey = getTicketVerifyingKey();
    const groupProofCache = new Map<string, Awaited<ReturnType<typeof verifyGroupOrderToken>>>();
    const parsed = await Promise.all(scans.map(async (scan) => {
      let proof: { kind: "ticket"; tokenHash: string } | { kind: "group"; orderId: string; attendeeCount: number } | null = null;
      if (Boolean(scan.ticketToken) !== Boolean(scan.groupOrderToken)) {
        if (scan.ticketToken) {
          const ticketProof = await verifyTicketProof(scan.ticketToken);
          if (ticketProof.valid) proof = { kind: "ticket", tokenHash: ticketProof.tokenHash };
        } else if (scan.groupOrderToken) {
          let verified = groupProofCache.get(scan.groupOrderToken);
          if (!verified) {
            verified = await verifyGroupOrderToken(scan.groupOrderToken, publicKey);
            groupProofCache.set(scan.groupOrderToken, verified);
          }
          if (verified.isValid) proof = {
            kind: "group",
            orderId: verified.payload.orderId,
            attendeeCount: verified.payload.attendeeCount,
          };
        }
      }
      return { ...scan, clientTime: new Date(scan.clientTimestamp), proof };
    }));
    if (parsed.some((scan) =>
      scan.clientTime.getTime() > now.getTime() + 2 * 60 * 1000 ||
      scan.clientTime.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000
    )) {
      return NextResponse.json({ error: "A scan timestamp is outside the accepted time window." }, { status: 422 });
    }

    let processedCount = 0;
    let conflictsCount = 0;
    let rejectedCount = 0;
    const results: Array<{ idempotencyKey: string; result: "processed" | "conflict" | "rejected" | "duplicate" }> = [];

    await db.transaction(async (tx) => {
      for (const scan of parsed) {
        const idempotencyKey = `${user.id}:${scan.idempotencyKey}`;
        if (!scan.proof) {
          rejectedCount++;
          await tx.insert(auditLog).values({
            staffId: user.id,
            action: "scanner_sync_invalid_proof",
            entityType: "attendees",
            entityId: scan.attendeeId,
            oldState: null,
            newState: { reason: "missing_or_invalid_ticket_proof", scanType: scan.scanType, idempotencyKey: scan.idempotencyKey },
            ipAddress: ip === "unknown" ? null : ip,
            userAgent: req.headers.get("user-agent"),
          });
          results.push({ idempotencyKey: scan.idempotencyKey, result: "rejected" });
          continue;
        }

        const [existing] = await tx.select({ id: scanEvents.id, attendeeId: scanEvents.attendeeId, scanType: scanEvents.scanType })
          .from(scanEvents)
          .where(eq(scanEvents.idempotencyKey, idempotencyKey))
          .limit(1);
        if (existing) {
          results.push({ idempotencyKey: scan.idempotencyKey, result: existing.attendeeId === scan.attendeeId && existing.scanType === scan.scanType ? "duplicate" : "rejected" });
          if (existing.attendeeId !== scan.attendeeId || existing.scanType !== scan.scanType) rejectedCount++;
          continue;
        }

        if (scan.proof.kind === "ticket") {
          const [matchingTicket] = await tx.select({ id: attendees.id }).from(attendees)
            .where(and(eq(attendees.id, scan.attendeeId), eq(attendees.qrTokenHash, scan.proof.tokenHash)))
            .limit(1);
          if (!matchingTicket) {
            rejectedCount++;
            await tx.insert(auditLog).values({
              staffId: user.id,
              action: "scanner_sync_invalid_proof",
              entityType: "attendees",
              entityId: scan.attendeeId,
              oldState: null,
              newState: { reason: "ticket_proof_does_not_match_attendee", scanType: scan.scanType, idempotencyKey: scan.idempotencyKey },
              ipAddress: ip === "unknown" ? null : ip,
              userAgent: req.headers.get("user-agent"),
            });
            results.push({ idempotencyKey: scan.idempotencyKey, result: "rejected" });
            continue;
          }
        }

        const [record] = await tx
          .select({ attendee: attendees, orderStatus: orders.status, isGroup: orders.isGroup })
          .from(attendees)
          .innerJoin(orders, eq(attendees.orderId, orders.id))
          .where(eq(attendees.id, scan.attendeeId))
          .for("update")
          .limit(1);

        const attendee = record?.attendee;
        if (!attendee || attendee.deletedAt || record.orderStatus !== "paid") {
          rejectedCount++;
          await tx.insert(auditLog).values({
            staffId: user.id,
            action: "scanner_sync_rejected",
            entityType: "attendees",
            entityId: scan.attendeeId,
            oldState: null,
            newState: { reason: "missing_deleted_or_unpaid_attendee", scanType: scan.scanType, idempotencyKey: scan.idempotencyKey },
            ipAddress: ip === "unknown" ? null : ip,
            userAgent: req.headers.get("user-agent"),
          });
          results.push({ idempotencyKey: scan.idempotencyKey, result: "rejected" });
          continue;
        }

        if (scan.proof.kind === "group") {
          const [groupOrder] = await tx.select({ id: orders.id }).from(orders)
            .where(and(eq(orders.id, scan.proof.orderId), eq(orders.status, "paid"), eq(orders.isGroup, true)))
            .limit(1);
          const [groupCount] = groupOrder
            ? await tx.select({ value: count() }).from(attendees)
              .where(and(eq(attendees.orderId, groupOrder.id), isNull(attendees.deletedAt)))
            : [{ value: 0 }];
          if (!groupOrder || !record.isGroup || attendee.orderId !== scan.proof.orderId || groupCount.value !== scan.proof.attendeeCount) {
            rejectedCount++;
            await tx.insert(auditLog).values({
              staffId: user.id,
              action: "scanner_sync_invalid_group_proof",
              entityType: "attendees",
              entityId: attendee.id,
              oldState: null,
              newState: { reason: "group_order_proof_does_not_match_roster", scanType: scan.scanType, idempotencyKey: scan.idempotencyKey },
              ipAddress: ip === "unknown" ? null : ip,
              userAgent: req.headers.get("user-agent"),
            });
            results.push({ idempotencyKey: scan.idempotencyKey, result: "rejected" });
            continue;
          }
        }

        if (scan.scanType === "arrival") {
          if (attendee.status === "unconfirmed") {
            rejectedCount++;
            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "arrival",
              staffId: user.id,
              standId: scan.standId,
              clientTimestamp: scan.clientTime,
              idempotencyKey,
              result: "forged",
              notes: "Paid attendee was not in a confirmed state during offline sync.",
            });
            results.push({ idempotencyKey: scan.idempotencyKey, result: "rejected" });
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
            results.push({ idempotencyKey: scan.idempotencyKey, result: "processed" });
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
            results.push({ idempotencyKey: scan.idempotencyKey, result: "conflict" });
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
            results.push({ idempotencyKey: scan.idempotencyKey, result: "conflict" });
            continue;
          }

          const allocatedDate = calendarDateInZone(scan.clientTime, "Africa/Lagos");
          const [stock] = await tx.select().from(bookletStock)
            .where(and(eq(bookletStock.standId, scan.standId), eq(bookletStock.allocatedDate, allocatedDate)))
            .for("update")
            .limit(1);
          if (!stock || stock.allocatedQuantity - stock.issuedCount - stock.returnedCount <= 0) {
            await tx.insert(scanEvents).values({
              attendeeId: attendee.id,
              scanType: "booklet",
              staffId: user.id,
              standId: scan.standId,
              clientTimestamp: scan.clientTime,
              idempotencyKey,
              result: "conflict",
              notes: !stock ? "No booklet allocation was configured for this stand and event day." : "Booklet allocation was exhausted before this offline issue synchronized.",
            });
            conflictsCount++;
            results.push({ idempotencyKey: scan.idempotencyKey, result: "conflict" });
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
          await tx.update(bookletStock).set({ issuedCount: stock.issuedCount + 1, updatedAt: now })
            .where(eq(bookletStock.id, stock.id));

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
          results.push({ idempotencyKey: scan.idempotencyKey, result: "processed" });
        }
      }
    });

    return NextResponse.json({
      success: true,
      processedCount,
      conflictsCount,
      rejectedCount,
      results,
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
