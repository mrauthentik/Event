CREATE TYPE "public"."attendee_status" AS ENUM('unconfirmed', 'confirmed', 'checked_in', 'booklet_issued');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('NGN', 'USD', 'EUR', 'GBP');--> statement-breakpoint
CREATE TYPE "public"."fee_policy" AS ENUM('organizer_absorbs', 'pass_to_customer');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'pending_payment', 'paid', 'expired', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('paystack', 'paypal', 'manual_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'pending', 'completed', 'declined', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."scan_result" AS ENUM('valid', 'already_checked_in', 'invalid_signature', 'forged', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('arrival', 'booklet', 'daily_attendance', 'custom');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('attendant', 'supervisor', 'finance', 'admin');--> statement-breakpoint
CREATE TABLE "manual_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"bank_name" varchar(128) NOT NULL,
	"account_name" varchar(128) NOT NULL,
	"reference_or_teller_id" varchar(128) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reviewed_by_staff_id" uuid,
	"admin_notes" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(16) NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"disputed" boolean DEFAULT false NOT NULL,
	"currency" "currency" NOT NULL,
	"total_minor" bigint NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"payer_name" varchar(255) NOT NULL,
	"payer_phone_e164" varchar(32) NOT NULL,
	"payer_email" varchar(255),
	"is_group" boolean DEFAULT false NOT NULL,
	"group_name" varchar(255),
	"idempotency_key" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_ref" varchar(255) NOT NULL,
	"provider_capture_id" varchar(255),
	"status" "payment_status" DEFAULT 'initiated' NOT NULL,
	"currency" "currency" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"raw_payload_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"group_id" uuid,
	"ticket_type_id" uuid NOT NULL,
	"ref_code" varchar(16) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone_e164" varchar(32) NOT NULL,
	"email" varchar(255),
	"country" varchar(64) DEFAULT 'Nigeria' NOT NULL,
	"state" varchar(64),
	"parish" varchar(255),
	"is_minor" boolean DEFAULT false NOT NULL,
	"guardian_name" varchar(255),
	"guardian_phone_e164" varchar(32),
	"status" "attendee_status" DEFAULT 'unconfirmed' NOT NULL,
	"qr_token_hash" varchar(64) NOT NULL,
	"checked_in_at" timestamp with time zone,
	"booklet_issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "attendees_ref_code_unique" UNIQUE("ref_code"),
	CONSTRAINT "attendees_qr_token_hash_unique" UNIQUE("qr_token_hash")
);
--> statement-breakpoint
CREATE TABLE "group_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"invite_code" varchar(32) NOT NULL,
	"attendee_id" uuid,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_seats_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"church_or_parish_name" varchar(255) NOT NULL,
	"leader_name" varchar(255) NOT NULL,
	"leader_phone_e164" varchar(32) NOT NULL,
	"leader_email" varchar(255),
	"total_seats" integer NOT NULL,
	"claimed_seats" integer DEFAULT 0 NOT NULL,
	"management_token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_management_token_unique" UNIQUE("management_token")
);
--> statement-breakpoint
CREATE TABLE "ticket_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_type_id" uuid NOT NULL,
	"currency" "currency" NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booklet_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stand_id" varchar(64) NOT NULL,
	"allocated_date" date NOT NULL,
	"allocated_quantity" integer NOT NULL,
	"issued_count" integer DEFAULT 0 NOT NULL,
	"returned_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_name" varchar(128) NOT NULL,
	"device_fingerprint" varchar(255) NOT NULL,
	"assigned_stand" varchar(64),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_fingerprint_unique" UNIQUE("device_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" uuid NOT NULL,
	"scan_type" "scan_type" DEFAULT 'arrival' NOT NULL,
	"staff_id" uuid,
	"device_id" uuid,
	"stand_id" varchar(64) NOT NULL,
	"client_timestamp" timestamp with time zone NOT NULL,
	"server_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"result" "scan_result" NOT NULL,
	"notes" varchar(500),
	CONSTRAINT "scan_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(64) NOT NULL,
	"old_state" jsonb,
	"new_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"username" varchar(64) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"role" "staff_role" DEFAULT 'attendant' NOT NULL,
	"totp_secret" varchar(128),
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_username_unique" UNIQUE("username"),
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "event_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" varchar(255) DEFAULT 'International Holiness General Conference 2026' NOT NULL,
	"theme" varchar(255) DEFAULT 'Man and Satan in Contention Against the Holy God' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"registration_deadline" timestamp with time zone NOT NULL,
	"venue_name" varchar(255) DEFAULT 'Holiness Campground' NOT NULL,
	"venue_address" text DEFAULT 'Behind FGC, Kwali, Abuja, Nigeria' NOT NULL,
	"venue_map_url" text,
	"contact_phone" varchar(32) DEFAULT '+234 701 566 8452' NOT NULL,
	"contact_email" varchar(255),
	"capacity_limit" integer,
	"capacity_alert_thresholds" text DEFAULT '8000,9000,10000',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministers" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"title_or_role" varchar(255) NOT NULL,
	"photo_url" text,
	"biography" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"title" varchar(255) NOT NULL,
	"speaker_or_leader" varchar(255),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_routes" (
	"currency" "currency" PRIMARY KEY NOT NULL,
	"primary_provider" "payment_provider" NOT NULL,
	"fallback_provider" "payment_provider" DEFAULT 'manual_transfer' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"fee_policy" "fee_policy" DEFAULT 'organizer_absorbs' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_seats" ADD CONSTRAINT "group_seats_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_seats" ADD CONSTRAINT "group_seats_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_prices" ADD CONSTRAINT "ticket_prices_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manual_payments_order_idx" ON "manual_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "manual_payments_status_idx" ON "manual_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_ref_idx" ON "orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("payer_phone_e164");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("payer_email");--> statement-breakpoint
CREATE INDEX "orders_expires_at_idx" ON "orders" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "attendees_ref_code_idx" ON "attendees" USING btree ("ref_code");--> statement-breakpoint
CREATE INDEX "attendees_phone_idx" ON "attendees" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "attendees_email_idx" ON "attendees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "attendees_qr_hash_idx" ON "attendees" USING btree ("qr_token_hash");--> statement-breakpoint
CREATE INDEX "attendees_order_idx" ON "attendees" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "attendees_group_idx" ON "attendees" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "attendees_status_idx" ON "attendees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_seats_group_idx" ON "group_seats" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_seats_invite_idx" ON "group_seats" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "ticket_prices_lookup_idx" ON "ticket_prices" USING btree ("ticket_type_id","currency");--> statement-breakpoint
CREATE INDEX "booklet_stock_stand_date_idx" ON "booklet_stock" USING btree ("stand_id","allocated_date");--> statement-breakpoint
CREATE INDEX "scan_events_attendee_idx" ON "scan_events" USING btree ("attendee_id");--> statement-breakpoint
CREATE INDEX "scan_events_stand_idx" ON "scan_events" USING btree ("stand_id");--> statement-breakpoint
CREATE INDEX "scan_events_client_time_idx" ON "scan_events" USING btree ("client_timestamp");--> statement-breakpoint
CREATE INDEX "scan_events_result_idx" ON "scan_events" USING btree ("result");--> statement-breakpoint
CREATE INDEX "audit_log_staff_idx" ON "audit_log" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");