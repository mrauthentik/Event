import { pgTable, uuid, varchar, integer, date, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { scanTypeEnum, scanResultEnum } from "./enums";
import { attendees } from "./attendees";

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceName: varchar("device_name", { length: 128 }).notNull(),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull().unique(),
  assignedStand: varchar("assigned_stand", { length: 64 }),
  isRevoked: boolean("is_revoked").notNull().default(false),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scanEvents = pgTable(
  "scan_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendeeId: uuid("attendee_id").references(() => attendees.id, { onDelete: "cascade" }).notNull(),
    scanType: scanTypeEnum("scan_type").notNull().default("arrival"),
    staffId: uuid("staff_id"),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    standId: varchar("stand_id", { length: 64 }).notNull(),
    clientTimestamp: timestamp("client_timestamp", { withTimezone: true }).notNull(),
    serverTimestamp: timestamp("server_timestamp", { withTimezone: true }).defaultNow().notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
    result: scanResultEnum("result").notNull(),
    notes: varchar("notes", { length: 500 }),
  },
  (table) => [
    index("scan_events_attendee_idx").on(table.attendeeId),
    index("scan_events_stand_idx").on(table.standId),
    index("scan_events_client_time_idx").on(table.clientTimestamp),
    index("scan_events_result_idx").on(table.result),
  ]
);

export const bookletStock = pgTable(
  "booklet_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    standId: varchar("stand_id", { length: 64 }).notNull(),
    allocatedDate: date("allocated_date").notNull(),
    allocatedQuantity: integer("allocated_quantity").notNull(),
    issuedCount: integer("issued_count").notNull().default(0),
    returnedCount: integer("returned_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("booklet_stock_stand_date_idx").on(table.standId, table.allocatedDate),
  ]
);

