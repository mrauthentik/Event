CREATE UNIQUE INDEX "booklet_stock_stand_date_uq"
  ON public.booklet_stock USING btree ("stand_id", "allocated_date");
--> statement-breakpoint
DROP INDEX IF EXISTS public.booklet_stock_stand_date_idx;
