WITH ranked_prices AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY ticket_type_id, currency
    ORDER BY updated_at DESC, created_at DESC, id DESC
  ) AS row_number
  FROM ticket_prices
)
DELETE FROM ticket_prices
WHERE id IN (SELECT id FROM ranked_prices WHERE row_number > 1);--> statement-breakpoint
UPDATE groups
SET management_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');--> statement-breakpoint
UPDATE group_seats
SET invite_code = replace(gen_random_uuid()::text, '-', '');--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_prices_type_currency_uq" ON "ticket_prices" USING btree ("ticket_type_id", "currency");
