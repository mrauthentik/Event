ALTER TABLE public.event_settings
  ADD COLUMN "bank_name" varchar(128),
  ADD COLUMN "bank_account_name" varchar(128),
  ADD COLUMN "bank_account_number" varchar(32);
