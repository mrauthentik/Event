import { pgTable, uuid, varchar, integer, bigint, boolean, timestamp, jsonb, index, text } from "drizzle-orm/pg-core";
import { orderStatusEnum, paymentStatusEnum, paymentProviderEnum, currencyEnum } from "./enums";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 16 }).notNull().unique(), // HGC-XXXXXX
    status: orderStatusEnum("status").notNull().default("draft"),
    disputed: boolean("disputed").notNull().default(false),
    currency: currencyEnum("currency").notNull(),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    feeMinor: integer("fee_minor").notNull().default(0),
    payerName: varchar("payer_name", { length: 255 }).notNull(),
    payerPhoneE164: varchar("payer_phone_e164", { length: 32 }).notNull(),
    payerEmail: varchar("payer_email", { length: 255 }),
    isGroup: boolean("is_group").notNull().default(false),
    groupName: varchar("group_name", { length: 255 }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orders_ref_idx").on(table.reference),
    index("orders_status_idx").on(table.status),
    index("orders_phone_idx").on(table.payerPhoneE164),
    index("orders_email_idx").on(table.payerEmail),
    index("orders_expires_at_idx").on(table.expiresAt),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerRef: varchar("provider_ref", { length: 255 }).notNull().unique(),
    providerCaptureId: varchar("provider_capture_id", { length: 255 }),
    checkoutUrl: text("checkout_url"),
    status: paymentStatusEnum("status").notNull().default("initiated"),
    currency: currencyEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    rawPayloadHash: varchar("raw_payload_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("payments_order_idx").on(table.orderId),
    index("payments_provider_ref_idx").on(table.providerRef),
  ]
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: paymentProviderEnum("provider").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }).notNull().unique(),
    payload: jsonb("payload").notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: varchar("error", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("webhook_events_provider_idx").on(table.provider),
    index("webhook_events_processed_idx").on(table.processed),
  ]
);

export const manualPayments = pgTable(
  "manual_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    bankName: varchar("bank_name", { length: 128 }).notNull(),
    accountName: varchar("account_name", { length: 128 }).notNull(),
    referenceOrTellerId: varchar("reference_or_teller_id", { length: 128 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, approved, rejected
    reviewedByStaffId: uuid("reviewed_by_staff_id"),
    adminNotes: varchar("admin_notes", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("manual_payments_order_idx").on(table.orderId),
    index("manual_payments_status_idx").on(table.status),
  ]
);

