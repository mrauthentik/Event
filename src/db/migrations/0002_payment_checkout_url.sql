ALTER TABLE public.payments ADD COLUMN checkout_url text;
--> statement-breakpoint

-- The application connects directly with its server-side Supabase database role.
-- Deny browser-facing Supabase API roles access to attendee, payment, and staff data.
REVOKE ALL ON TABLE
  public.manual_payments,
  public.orders,
  public.payments,
  public.webhook_events,
  public.attendees,
  public.group_seats,
  public.groups,
  public.ticket_prices,
  public.ticket_types,
  public.booklet_stock,
  public.devices,
  public.scan_events,
  public.audit_log,
  public.sessions,
  public.staff_users,
  public.event_settings,
  public.ministers,
  public.programme_items,
  public.provider_routes
FROM anon, authenticated;
--> statement-breakpoint

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.group_seats ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.ticket_prices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.booklet_stock ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.ministers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.programme_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.provider_routes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

INSERT INTO public.event_settings (starts_at, ends_at, registration_deadline)
SELECT
  '2026-12-08T16:00:00+01:00'::timestamptz,
  '2026-12-11T23:59:59+01:00'::timestamptz,
  '2026-12-11T23:59:59+01:00'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM public.event_settings);
