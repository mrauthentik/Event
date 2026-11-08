import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { attendeeStatusEnum, currencyEnum } from "./enums";
import { orders } from "./orders";

export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(), // "Standard Registration"
  description: varchar("description", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketPrices = pgTable(
  "ticket_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketTypeId: uuid("ticket_type_id").references(() => ticketTypes.id, { onDelete: "cascade" }).notNull(),
    currency: currencyEnum("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(), // 500000 for NGN 5000, 2000 for $20
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ticket_prices_lookup_idx").on(table.ticketTypeId, table.currency),
  ]
);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  churchOrParishName: varchar("church_or_parish_name", { length: 255 }).notNull(),
  leaderName: varchar("leader_name", { length: 255 }).notNull(),
  leaderPhoneE164: varchar("leader_phone_e164", { length: 32 }).notNull(),
  leaderEmail: varchar("leader_email", { length: 255 }),
  totalSeats: integer("total_seats").notNull(),
  claimedSeats: integer("claimed_seats").notNull().default(0),
  managementToken: varchar("management_token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendees = pgTable(
  "attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    ticketTypeId: uuid("ticket_type_id").references(() => ticketTypes.id).notNull(),
    refCode: varchar("ref_code", { length: 16 }).notNull().unique(), // HGC-XXXXXX
    name: varchar("name", { length: 255 }).notNull(),
    phoneE164: varchar("phone_e164", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }),
    country: varchar("country", { length: 64 }).notNull().default("Nigeria"),
    state: varchar("state", { length: 64 }), // Required for Nigeria
    parish: varchar("parish", { length: 255 }),
    isMinor: boolean("is_minor").notNull().default(false),
    guardianName: varchar("guardian_name", { length: 255 }),
    guardianPhoneE164: varchar("guardian_phone_e164", { length: 32 }),
    status: attendeeStatusEnum("status").notNull().default("unconfirmed"),
    qrTokenHash: varchar("qr_token_hash", { length: 64 }).notNull().unique(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    bookletIssuedAt: timestamp("booklet_issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => [
    index("attendees_ref_code_idx").on(table.refCode),
    index("attendees_phone_idx").on(table.phoneE164),
    index("attendees_email_idx").on(table.email),
    index("attendees_qr_hash_idx").on(table.qrTokenHash),
    index("attendees_order_idx").on(table.orderId),
    index("attendees_group_idx").on(table.groupId),
    index("attendees_status_idx").on(table.status),
  ]
);

export const groupSeats = pgTable(
  "group_seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
    inviteCode: varchar("invite_code", { length: 32 }).notNull().unique(),
    attendeeId: uuid("attendee_id").references(() => attendees.id, { onDelete: "set null" }),
    isClaimed: boolean("is_claimed").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("group_seats_group_idx").on(table.groupId),
    index("group_seats_invite_idx").on(table.inviteCode),
  ]
);

