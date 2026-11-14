import Dexie, { type EntityTable } from "dexie";

export interface CachedAttendee {
  tokenHash: string; // Primary key for fast O(1) hash lookup
  ticketId: string;
  attendeeId: string;
  orderId: string;
  refCode: string;
  name: string;
  parish: string | null;
  status: "unconfirmed" | "confirmed" | "checked_in" | "booklet_issued";
  bookletIssuedAt: string | null;
  checkedInAt: string | null;
  checkedInStand: string | null;
  updatedAt: string;
}

export interface PendingScan {
  id?: number;
  attendeeId: string;
  scanType: "arrival" | "booklet";
  standId: string;
  staffId: string;
  deviceId: string;
  clientTimestamp: string;
  idempotencyKey: string;
  synced: boolean;
}

export interface ScannerSetting {
  key: string;
  value: any;
}

class ScannerDatabase extends Dexie {
  cachedAttendees!: EntityTable<CachedAttendee, "tokenHash">;
  pendingScans!: EntityTable<PendingScan, "id">;
  scannerSettings!: EntityTable<ScannerSetting, "key">;

  constructor() {
    super("HoremowScannerDB");
    this.version(1).stores({
      cachedAttendees: "&tokenHash, attendeeId, refCode, status",
      pendingScans: "++id, attendeeId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
    this.version(2).stores({
      cachedAttendees: "&tokenHash, attendeeId, orderId, refCode, status",
      pendingScans: "++id, attendeeId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
    this.version(3).stores({
      cachedAttendees: "&tokenHash, ticketId, attendeeId, orderId, refCode, status",
      pendingScans: "++id, attendeeId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
  }
}

export const scannerDb = new ScannerDatabase();

