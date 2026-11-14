import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendees, bookletStock, orders, scanEvents } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/security/origin";
import { verifyTicketProof } from "@/lib/scanner/ticket-proof";
import { calendarDateInZone } from "@/lib/timezone";

const inputSchema = z.object({
  ticketToken: z.string().trim().min(32).max(4096),
  scanType: z.enum(["arrival", "booklet"]),
  standId: z.string().trim().min(1).max(64),
  idempotencyKey: z.string().uuid(),
});

class ScannerActionError extends Error {}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await requireRole("attendant");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const limit = await rateLimit(`scanner_record:${user.id}:${ip}`, 120, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many scanner actions. Try again shortly." }, {
    status: 429,
    headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
  });

  try {
    const input = inputSchema.parse(await req.json());
    const proof = await verifyTicketProof(input.ticketToken);
    if (!proof.valid) return NextResponse.json({ error: "Ticket signature is invalid or unavailable." }, { status: 403 });
    const now = new Date();
    const allocatedDate = calendarDateInZone(now, "Africa/Lagos");
    const idempotencyKey = `${user.id}:${input.idempotencyKey}`;
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select({ attendee: attendees, orderStatus: orders.status })
        .from(attendees)
        .innerJoin(orders, eq(attendees.orderId, orders.id))
        .where(eq(attendees.qrTokenHash, proof.tokenHash))
        .for("update")
        .limit(1);
      const attendee = row?.attendee;
      if (!attendee || attendee.deletedAt || row.orderStatus !== "paid") {
        throw new ScannerActionError("This attendee is not available for check-in.");
      }

      const [priorEvent] = await tx.select().from(scanEvents)
        .where(eq(scanEvents.idempotencyKey, idempotencyKey))
        .limit(1);
      if (priorEvent) {
        if (priorEvent.attendeeId !== attendee.id || priorEvent.scanType !== input.scanType) {
          throw new ScannerActionError("This scan retry key was already used for a different ticket or action.");
        }
        if (priorEvent.result === "conflict" || priorEvent.result === "forged") {
          if (input.scanType === "arrival" && attendee.checkedInAt) {
            const [arrival] = await tx.select({ standId: scanEvents.standId }).from(scanEvents)
              .where(and(eq(scanEvents.attendeeId, attendee.id), eq(scanEvents.scanType, "arrival"), eq(scanEvents.result, "valid")))
              .orderBy(desc(scanEvents.serverTimestamp)).limit(1);
            return {
              outcome: "already_checked_in" as const,
              status: attendee.status,
              checkedInAt: attendee.checkedInAt.toISOString(),
              bookletIssuedAt: attendee.bookletIssuedAt?.toISOString() ?? null,
              checkedInStand: arrival?.standId ?? null,
            };
          }
          if (input.scanType === "booklet" && attendee.bookletIssuedAt) {
            return {
              outcome: "already_issued" as const,
              status: attendee.status,
              checkedInAt: attendee.checkedInAt?.toISOString() ?? null,
              bookletIssuedAt: attendee.bookletIssuedAt.toISOString(),
              checkedInStand: input.standId,
            };
          }
          throw new ScannerActionError("That scanner action was not accepted. Refresh the attendee status and try again.");
        }
        const [arrival] = input.scanType === "arrival" && attendee.checkedInAt
          ? await tx.select({ standId: scanEvents.standId }).from(scanEvents)
            .where(and(eq(scanEvents.attendeeId, attendee.id), eq(scanEvents.scanType, "arrival"), eq(scanEvents.result, "valid")))
            .orderBy(desc(scanEvents.serverTimestamp)).limit(1)
          : [];
        return {
          outcome: priorEvent.result === "valid"
            ? input.scanType === "arrival" ? "checked_in" as const : "issued" as const
            : priorEvent.result === "already_checked_in"
              ? "already_checked_in" as const
              : "already_issued" as const,
          status: attendee.status,
          checkedInAt: attendee.checkedInAt?.toISOString() ?? null,
          bookletIssuedAt: attendee.bookletIssuedAt?.toISOString() ?? null,
          checkedInStand: arrival?.standId ?? input.standId,
        };
      }

      if (input.scanType === "arrival") {
        if (attendee.status === "unconfirmed") throw new ScannerActionError("This ticket is not confirmed for entry.");
        if (attendee.checkedInAt) {
          const [arrival] = await tx.select({ standId: scanEvents.standId }).from(scanEvents)
            .where(and(eq(scanEvents.attendeeId, attendee.id), eq(scanEvents.scanType, "arrival"), eq(scanEvents.result, "valid")))
            .orderBy(desc(scanEvents.serverTimestamp)).limit(1);
          await tx.insert(scanEvents).values({
            attendeeId: attendee.id,
            scanType: "arrival",
            staffId: user.id,
            standId: input.standId,
            clientTimestamp: now,
            idempotencyKey,
            result: "already_checked_in",
            notes: "Online scanner detected a prior arrival.",
          });
          return {
            outcome: "already_checked_in" as const,
            status: attendee.status,
            checkedInAt: attendee.checkedInAt.toISOString(),
            bookletIssuedAt: attendee.bookletIssuedAt?.toISOString() ?? null,
            checkedInStand: arrival?.standId ?? null,
          };
        }

        const [updated] = await tx.update(attendees).set({
          status: attendee.bookletIssuedAt ? "booklet_issued" : "checked_in",
          checkedInAt: now,
          updatedAt: now,
        }).where(and(
          eq(attendees.id, attendee.id),
          eq(attendees.status, "confirmed"),
          isNull(attendees.checkedInAt),
          isNull(attendees.deletedAt),
        )).returning();
        if (!updated) throw new ScannerActionError("This ticket changed while it was being scanned. Scan it again to refresh its status.");
        await tx.insert(scanEvents).values({
          attendeeId: attendee.id,
          scanType: "arrival",
          staffId: user.id,
          standId: input.standId,
          clientTimestamp: now,
          idempotencyKey,
          result: "valid",
          notes: "Online atomic arrival check-in.",
        });
        return {
          outcome: "checked_in" as const,
          status: updated.status,
          checkedInAt: now.toISOString(),
          bookletIssuedAt: updated.bookletIssuedAt?.toISOString() ?? null,
          checkedInStand: input.standId,
        };
      }

      if (!attendee.checkedInAt) throw new ScannerActionError("Record the attendee arrival before issuing a booklet.");
      if (attendee.bookletIssuedAt) {
        await tx.insert(scanEvents).values({
          attendeeId: attendee.id,
          scanType: "booklet",
          staffId: user.id,
          standId: input.standId,
          clientTimestamp: now,
          idempotencyKey,
          result: "conflict",
          notes: "Booklet was already issued.",
        });
        return {
          outcome: "already_issued" as const,
          status: attendee.status,
          checkedInAt: attendee.checkedInAt.toISOString(),
          bookletIssuedAt: attendee.bookletIssuedAt.toISOString(),
          checkedInStand: input.standId,
        };
      }

      const [stock] = await tx.select().from(bookletStock)
        .where(and(eq(bookletStock.standId, input.standId), eq(bookletStock.allocatedDate, allocatedDate)))
        .for("update")
        .limit(1);
      if (!stock) throw new ScannerActionError("No booklet allocation is configured for this stand today. Ask an administrator to set up stock.");
      if (stock.allocatedQuantity - stock.issuedCount - stock.returnedCount <= 0) {
        throw new ScannerActionError("This stand has no booklets remaining today. Direct the attendee to another assigned stand.");
      }

      const [updated] = await tx.update(attendees).set({
        status: "booklet_issued",
        bookletIssuedAt: now,
        updatedAt: now,
      }).where(and(
        eq(attendees.id, attendee.id),
        isNotNull(attendees.checkedInAt),
        isNull(attendees.bookletIssuedAt),
        isNull(attendees.deletedAt),
      )).returning();
      if (!updated) throw new ScannerActionError("Booklet status changed during this scan. Scan the ticket again to refresh it.");
      await tx.update(bookletStock).set({ issuedCount: stock.issuedCount + 1, updatedAt: now })
        .where(eq(bookletStock.id, stock.id));
      await tx.insert(scanEvents).values({
        attendeeId: attendee.id,
        scanType: "booklet",
        staffId: user.id,
        standId: input.standId,
        clientTimestamp: now,
        idempotencyKey,
        result: "valid",
        notes: "Online atomic booklet issuance.",
      });
      return {
        outcome: "issued" as const,
        status: updated.status,
        checkedInAt: updated.checkedInAt?.toISOString() ?? null,
        bookletIssuedAt: now.toISOString(),
        checkedInStand: input.standId,
      };
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid scanner action." }, { status: 422 });
    if (error instanceof ScannerActionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Scanner atomic action failed.");
    return NextResponse.json({ error: "Scanner action failed. Try again or sync the scanner." }, { status: 500 });
  }
}
