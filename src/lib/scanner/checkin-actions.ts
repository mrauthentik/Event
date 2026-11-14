import { scannerDb, type CachedAttendee, type PendingScan } from "@/lib/offline/dexie-db";

type ScanType = "arrival" | "booklet";
type ScannerStatus = CachedAttendee["status"];
type RecordScanResponse = {
  outcome: "checked_in" | "already_checked_in" | "issued" | "already_issued";
  status: ScannerStatus;
  checkedInAt: string | null;
  bookletIssuedAt: string | null;
  checkedInStand: string | null;
};

export type ArrivalCheckInResult = {
  outcome: "checked_in" | "already_checked_in" | "queued";
  attendee: CachedAttendee;
};

export type BookletIssueResult = {
  outcome: "issued" | "already_issued" | "queued";
  attendee: CachedAttendee;
};

async function queueForSync(
  attendee: CachedAttendee,
  scanType: ScanType,
  standId: string,
  clientTimestamp: string,
  idempotencyKey: string,
  proof: { ticketToken?: string; groupOrderToken?: string },
): Promise<void> {
  const scan: PendingScan = {
    attendeeId: attendee.attendeeId,
    scanType,
    standId,
    clientTimestamp,
    idempotencyKey,
    ...proof,
    synced: false,
  };

  await scannerDb.transaction("rw", scannerDb.cachedAttendees, scannerDb.pendingScans, async () => {
    await scannerDb.cachedAttendees.put(attendee);
    await scannerDb.pendingScans.add(scan);
  });

  if (typeof navigator !== "undefined" && navigator.onLine) {
    void fetch("/api/scanner/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scans: [scan] }),
    }).catch(() => {
      // Keep the IndexedDB job for the next explicit sync.
    });
  }
}

function offlineAttendee(attendee: CachedAttendee, scanType: ScanType, standId: string, timestamp: string): CachedAttendee {
  if (scanType === "arrival") {
    return {
      ...attendee,
      status: attendee.bookletIssuedAt ? "booklet_issued" : "checked_in",
      checkedInAt: timestamp,
      checkedInStand: standId,
    };
  }
  return { ...attendee, status: "booklet_issued", bookletIssuedAt: timestamp };
}

function onlineAttendee(attendee: CachedAttendee, response: RecordScanResponse): CachedAttendee {
  return {
    ...attendee,
    status: response.status,
    checkedInAt: response.checkedInAt,
    bookletIssuedAt: response.bookletIssuedAt,
    checkedInStand: response.checkedInStand,
  };
}

async function recordScan(attendee: CachedAttendee, scanType: ScanType, standId: string, ticketToken: string) {
  const clientTimestamp = new Date().toISOString();
  const idempotencyKey = crypto.randomUUID();

  if (typeof navigator === "undefined" || !navigator.onLine) {
    const updated = offlineAttendee(attendee, scanType, standId, clientTimestamp);
    await queueForSync(updated, scanType, standId, clientTimestamp, idempotencyKey, { ticketToken });
    return { outcome: "queued" as const, attendee: updated };
  }

  let response: Response;
  try {
    response = await fetch("/api/scanner/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketToken, scanType, standId, idempotencyKey }),
    });
  } catch {
    // Reuse the same idempotency key if the server committed but the response was lost.
    const updated = offlineAttendee(attendee, scanType, standId, clientTimestamp);
    await queueForSync(updated, scanType, standId, clientTimestamp, idempotencyKey, { ticketToken });
    return { outcome: "queued" as const, attendee: updated };
  }

  const payload = await response.json().catch(() => null) as (RecordScanResponse & { error?: string }) | null;
  if (!response.ok || !payload?.outcome || !payload.status) {
    throw new Error(payload?.error || "The scan could not be confirmed. Retry the scan or sync this device.");
  }
  const updated = onlineAttendee(attendee, payload);
  await scannerDb.cachedAttendees.put(updated);
  return { outcome: payload.outcome, attendee: updated };
}

/** Online arrivals use the server's row lock and conditional update. Offline arrivals are queued locally. */
export async function recordArrivalCheckIn(attendee: CachedAttendee, standId: string, ticketToken: string): Promise<ArrivalCheckInResult> {
  const result = await recordScan(attendee, "arrival", standId, ticketToken);
  if (result.outcome === "queued") return result;
  return { outcome: result.outcome as "checked_in" | "already_checked_in", attendee: result.attendee };
}

/** Booklet issue requires a recorded arrival online; offline issue remains queued for server validation. */
export async function issueConferenceBooklet(attendee: CachedAttendee, standId: string, ticketToken: string): Promise<BookletIssueResult> {
  const result = await recordScan(attendee, "booklet", standId, ticketToken);
  if (result.outcome === "queued") return result;
  return { outcome: result.outcome as "issued" | "already_issued", attendee: result.attendee };
}

/** Applies an offline group action as one IndexedDB transaction and queues each seat for idempotent sync. */
export async function recordGroupArrivalCheckIn(attendees: CachedAttendee[], standId: string, groupOrderToken: string): Promise<CachedAttendee[]> {
  const clientTimestamp = new Date().toISOString();
  const eligibleIds = new Set(attendees.filter((attendee) => attendee.status === "confirmed").map((attendee) => attendee.attendeeId));
  const updated = attendees.map((attendee) => eligibleIds.has(attendee.attendeeId)
    ? { ...attendee, status: "checked_in" as const, checkedInAt: clientTimestamp, checkedInStand: standId }
    : attendee
  );
  const pending: PendingScan[] = attendees
    .filter((attendee) => eligibleIds.has(attendee.attendeeId))
    .map((attendee) => ({
      attendeeId: attendee.attendeeId,
      scanType: "arrival",
      standId,
      clientTimestamp,
      idempotencyKey: `group_arrival_${crypto.randomUUID()}`,
      groupOrderToken,
      synced: false,
    }));

  await scannerDb.transaction("rw", scannerDb.cachedAttendees, scannerDb.pendingScans, async () => {
    await scannerDb.cachedAttendees.bulkPut(updated);
    if (pending.length) await scannerDb.pendingScans.bulkAdd(pending);
  });
  return updated;
}
