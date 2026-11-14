import { pgTable, uuid, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { attendees } from "./attendees";

export type NotificationChannel = "sms" | "email";
export type TicketNotificationPayload = {
  attendeeName: string;
  refCode: string;
  phoneE164?: string;
  email?: string | null;
  ticketUrl: string;
};

export const notificationJobs = pgTable("notification_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  attendeeId: uuid("attendee_id").references(() => attendees.id, { onDelete: "cascade" }).notNull(),
  channel: varchar("channel", { length: 16 }).$type<NotificationChannel>().notNull(),
  payload: jsonb("payload").$type<TicketNotificationPayload>().notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastError: varchar("last_error", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_jobs_status_available_idx").on(table.status, table.availableAt),
  index("notification_jobs_order_idx").on(table.orderId),
]);
