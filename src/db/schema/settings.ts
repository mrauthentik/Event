import { pgTable, serial, varchar, text, integer, boolean, timestamp, time, date } from "drizzle-orm/pg-core";
import { currencyEnum, paymentProviderEnum, feePolicyEnum } from "./enums";

export const eventSettings = pgTable("event_settings", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull().default("International Holiness General Conference 2026"),
  theme: varchar("theme", { length: 255 }).notNull().default("Man and Satan in Contention Against the Holy God"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  registrationDeadline: timestamp("registration_deadline", { withTimezone: true }).notNull(),
  venueName: varchar("venue_name", { length: 255 }).notNull().default("Holiness Campground"),
  venueAddress: text("venue_address").notNull().default("Behind FGC, Kwali, Abuja, Nigeria"),
  venueMapUrl: text("venue_map_url"),
  contactPhone: varchar("contact_phone", { length: 32 }).notNull().default("+234 701 566 8452"),
  contactEmail: varchar("contact_email", { length: 255 }),
  bankName: varchar("bank_name", { length: 128 }),
  bankAccountName: varchar("bank_account_name", { length: 128 }),
  bankAccountNumber: varchar("bank_account_number", { length: 32 }),
  capacityLimit: integer("capacity_limit"), // null = uncapped
  capacityAlertThresholds: text("capacity_alert_thresholds").default("8000,9000,10000"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerRoutes = pgTable("provider_routes", {
  currency: currencyEnum("currency").primaryKey(),
  primaryProvider: paymentProviderEnum("primary_provider").notNull(),
  fallbackProvider: paymentProviderEnum("fallback_provider").notNull().default("manual_transfer"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  feePolicy: feePolicyEnum("fee_policy").notNull().default("organizer_absorbs"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ministers = pgTable("ministers", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  titleOrRole: varchar("title_or_role", { length: 255 }).notNull(),
  photoUrl: text("photo_url"),
  biography: text("biography"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const programmeItems = pgTable("programme_items", {
  id: serial("id").primaryKey(),
  eventDate: date("event_date").notNull(), // 2026-12-08 to 2026-12-11
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  title: varchar("title", { length: 255 }).notNull(),
  speakerOrLeader: varchar("speaker_or_leader", { length: 255 }),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

