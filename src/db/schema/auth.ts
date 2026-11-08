import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { staffRoleEnum } from "./enums";

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(), // Argon2id hash
  role: staffRoleEnum("role").notNull().default("attendant"),
  totpSecret: varchar("totp_secret", { length: 128 }),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: uuid("user_id").references(() => staffUsers.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }).notNull(),
    oldState: jsonb("old_state"),
    newState: jsonb("new_state"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_staff_idx").on(table.staffId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ]
);

