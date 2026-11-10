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
