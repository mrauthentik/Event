CREATE TABLE public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  channel varchar(16) NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  status varchar(16) NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX notification_jobs_status_available_idx ON public.notification_jobs (status, available_at);
--> statement-breakpoint
CREATE INDEX notification_jobs_order_idx ON public.notification_jobs (order_id);
--> statement-breakpoint
REVOKE ALL ON TABLE public.notification_jobs FROM anon, authenticated;
--> statement-breakpoint
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
