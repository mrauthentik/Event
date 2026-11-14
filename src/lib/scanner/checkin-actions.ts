import { scannerDb, CachedAttendee, PendingScan } from "@/lib/offline/dexie-db";

const STAFF_ID = "staff_gate_attendant";
const DEVICE_ID = "pwa_client_device";

async function queueScan(
  attendeeId: string,
  scanType: "arrival" | "booklet",
  standId: string,
  clientTimestamp: string
): Promise<void> {
  const idempotencyKey = `${scanType}_${attendeeId}_${Date.now()}`;

  const pending: PendingScan = {
    attendeeId,
    scanType,
    standId,
    staffId: STAFF_ID,
    deviceId: DEVICE_ID,
    clientTimestamp,
    idempotencyKey,
    synced: false,
  };
  await scannerDb.pendingScans.add(pending);

  // Fire-and-forget background sync when online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    fetch("/api/scanner/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scans: [
          {
            attendeeId,
            scanType,
            standId,
            clientTimestamp,
            idempotencyKey,
          },
        ],
      }),
    }).catch(() => {});
  }
}

/** Marks an attendee as checked in and queues the arrival scan. */
export async function recordArrivalCheckIn(
  attendee: CachedAttendee,
  standId: string
): Promise<CachedAttendee> {
  const clientTimestamp = new Date().toISOString();
  const updated: CachedAttendee = {
    ...attendee,
    status: "checked_in",
    checkedInAt: clientTimestamp,
    checkedInStand: standId,
  };
  await scannerDb.cachedAttendees.put(updated);
  await queueScan(attendee.attendeeId, "arrival", standId, clientTimestamp);
  return updated;
}

/** Applies a group check-in locally as one IndexedDB transaction while queuing each attendee for atomic server sync. */
export async function recordGroupArrivalCheckIn(
  attendees: CachedAttendee[],
  standId: string
): Promise<CachedAttendee[]> {
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
      staffId: STAFF_ID,
      deviceId: DEVICE_ID,
      clientTimestamp,
      idempotencyKey: `group_arrival_${crypto.randomUUID()}`,
      synced: false,
    }));

  await scannerDb.transaction("rw", scannerDb.cachedAttendees, scannerDb.pendingScans, async () => {
    await scannerDb.cachedAttendees.bulkPut(updated);
    if (pending.length) await scannerDb.pendingScans.bulkAdd(pending);
  });
  return updated;
}

/** Marks an attendee's booklet as issued and queues the booklet scan. */
export async function issueConferenceBooklet(
  attendee: CachedAttendee,
  standId: string
): Promise<CachedAttendee> {
  const clientTimestamp = new Date().toISOString();
  const updated: CachedAttendee = {
    ...attendee,
    status: "booklet_issued",
    bookletIssuedAt: clientTimestamp,
  };
  await scannerDb.cachedAttendees.put(updated);
  await queueScan(attendee.attendeeId, "booklet", standId, clientTimestamp);
  return updated;
}
