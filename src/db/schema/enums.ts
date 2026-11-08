import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "pending_payment",
  "paid",
  "expired",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "initiated",
  "pending",
  "completed",
  "declined",
  "refunded",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "paystack",
  "paypal",
  "manual_transfer",
]);

export const currencyEnum = pgEnum("currency", [
  "NGN",
  "USD",
  "EUR",
  "GBP",
]);

export const attendeeStatusEnum = pgEnum("attendee_status", [
  "unconfirmed",
  "confirmed",
  "checked_in",
  "booklet_issued",
]);

export const scanTypeEnum = pgEnum("scan_type", [
  "arrival",
  "booklet",
  "daily_attendance",
  "custom",
]);

export const scanResultEnum = pgEnum("scan_result", [
  "valid",
  "already_checked_in",
  "invalid_signature",
  "forged",
  "conflict",
]);

export const staffRoleEnum = pgEnum("staff_role", [
  "attendant",
  "supervisor",
  "finance",
  "admin",
]);

export const feePolicyEnum = pgEnum("fee_policy", [
  "organizer_absorbs",
  "pass_to_customer",
]);
