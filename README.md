# IHGC 2026 registration and check-in

Next.js App Router application for Horemow’s International Holiness General Conference 2026. PostgreSQL is hosted on Supabase and accessed server-side through Drizzle. The browser does not use Supabase credentials.

## Local setup

1. Install Node.js 22 or newer and pnpm 10.
2. Run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env` and configure the required values below.
4. Apply migrations to a Supabase development project with `pnpm db:migrate`.
5. Start the app with `pnpm dev`.

Keep `.env` and all production secrets out of source control and build logs.

## Supabase database configuration

- Set `DATABASE_URL` to the Supabase **transaction pooler** connection string on port `6543` for the deployed application. Keep `prepare: false` for transaction-pooler compatibility.
- Set `MIGRATION_DATABASE_URL` to the Supabase **direct database** connection string on port `5432` when running Drizzle migrations. If direct connectivity is unavailable from the operator’s network, use Supabase’s session pooler for migrations.
- Require SSL on both URLs. Never use the Supabase anon key as a PostgreSQL credential.
- `pnpm db:migrate` applies checked-in, versioned SQL migrations. Do not use `db:push` against production.
- Migration `0002_payment_checkout_url` adds payment retry state, revokes Supabase `anon` and `authenticated` table grants, and enables row level security on all application tables without browser policies. The server’s PostgreSQL role must retain its privileged database access. Apply this migration before exposing the Supabase project’s Data API.
- Migration `0003_durable_notifications` adds the private SMS/email outbox used by payment, manual approval, walk-in, and recovery flows. It also enables RLS and revokes browser-role grants for the queue table. Apply all checked-in migrations in order to Supabase before deploying this code.
- Migration 0002 seeds default event dates and registration deadline when the settings table is empty. Review event settings, prices, and enabled provider routes in the admin console before opening registration.

## Environment variables

`.env.example` is the full template. Production requires:

- Supabase `DATABASE_URL` and a separate `MIGRATION_DATABASE_URL` for releases.
- Real Upstash REST URL and token. Rate limiting intentionally fails closed in production if Redis is missing or unreachable.
- Cloudflare Turnstile site and secret keys.
- `TICKET_SIGNING_PRIVATE_KEY` and `NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY`. Generate a new pair with `node --experimental-strip-types scripts/gen-ticket-keys.ts`; store only the private seed server-side. Do not rotate it without a planned ticket migration.
- `NEXT_PUBLIC_APP_URL` set to the HTTPS production origin.
- Separate sandbox/live Paystack and PayPal credentials, with each provider’s webhook configured to its matching environment. Verify Paystack’s supported currencies with the account owner before routing non-NGN checkout to it.
- Termii and Resend credentials for SMS and optional email delivery. Configure SPF, DKIM, and DMARC for the sending domain before email launch.
- `CRON_SECRET` for the maintenance endpoint and `SUPERVISOR_PIN` for audited scanner overrides.

`AUTH_SECRET` and the Inngest values remain in the template for planned integrations; the current database-backed session flow and maintenance endpoint do not use them.

## First administrator and two-factor setup

Create the first administrator once, from a trusted terminal, with `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (at least 10 characters), and optionally `ADMIN_FULL_NAME` set:

```powershell
node --experimental-strip-types scripts/seed-admin.ts
```

Admin and finance roles cannot sign in until TOTP is provisioned. After creating the account, use a trusted terminal to run:

```powershell
node --env-file=.env scripts/provision-totp.mjs admin
```

Add the one-time URI or setup key to the administrator’s authenticator immediately. The command enables TOTP and will not print an existing secret again. Do not provision TOTP by sending its URI through chat, email, or a CI log.

## Payments and operations

- Checkout uses server-side prices in integer minor units. Paystack and PayPal webhooks are signature-checked and then verified against the provider API before fulfillment.
- Configure webhook URLs at `/api/webhooks/paystack` and `/api/webhooks/paypal`. Do not mark an order paid from a screenshot or client redirect.
- Schedule `GET /api/cron/maintenance` every few minutes with `Authorization: Bearer $CRON_SECRET`. It processes up to 20 due ticket-message jobs before slower payment reconciliation, expires stale orders, and reconciles pending provider payments. Jobs retry with exponential delays for up to eight attempts; stale worker locks are recovered. Monitor its HTTP status and notification counts.
- Manual bank transfer is deliberately unavailable in checkout until organizers provide account details and the submission/reconciliation workflow is completed. The finance approval screen must only be used after a real bank-statement review.
- SMS/email jobs are written in the same transaction as ticket confirmation. Admins can inspect failed jobs at `/admin/messaging` and retry them; ticket recovery also enqueues a resend. Delivery is at-least-once because SMS/email providers do not share a transaction with Supabase, so a provider-accepted message can be repeated if the worker crashes before recording success. The on-screen ticket remains the reliable primary delivery. Configure provider monitoring and perform delivery/resend tests before launch.
- PayPal can hold funds or limit an account. Finance should monitor the provider dashboard and settlement balance; do not treat a completed ticket as proof that funds are immediately withdrawable.

## Backup and restore runbook

1. Enable and verify Supabase’s scheduled backups/PITR for the production project and record retention and recovery-point objectives with the project owner.
2. Before launch, restore a recent backup into a separate staging project using Supabase’s recovery workflow. Apply any migrations newer than the restored point.
3. Verify that orders, attendees, payment references, ticket signing keys, admin sessions, and a sample ticket are consistent. Never send test messages or live refunds from the restore environment.
4. Record the restore time, recovery point, validation results, and operator. Repeat after material schema changes and on a regular schedule.

No production backup or restore has been performed from this repository. Treat a restore drill as a launch gate.

## Incident runbooks

### Webhook failure or delayed ticket

Check provider delivery history and the application’s server logs. Confirm the raw webhook signature and provider environment, then use the maintenance reconciler or the ticket recovery form to query the provider. Review `webhook_events` for the event and sanitized verification result. Do not replay an event by editing payment/order state manually. If a provider is unavailable, leave the order pending and retry after it recovers.

### Payment amount or currency mismatch

Do not issue a ticket or approve the payment. Compare the order total/currency with the provider transaction or capture and bank settlement record. Escalate to finance, retain the provider reference, and record the resolution in the audit log. Refunds are not automated in the current application.

### PayPal hold or account limitation

Check PayPal’s Resolution Center and settlement dashboard, confirm the capture state, and keep the order/ticket state tied to the verified capture. Contact PayPal through the account’s support channel. Do not change provider credentials from sandbox to live as a workaround.

### Lost staff device or account

Deactivate the staff account in the database/admin process and revoke its sessions (`sessions.revoked = true`). A device management/revocation screen is not implemented yet. A scanner that has already synced can retain its minimal offline roster and queued scans in local IndexedDB; physically recover or clear that device before reuse. Offline revocation cannot take effect until the device reconnects.

## Checks

- `pnpm test` runs the Vitest unit suite.
- `node_modules/.bin/tsc --noEmit` checks TypeScript.
- `pnpm build` creates the production build.
- `pnpm audit --prod --audit-level high` checks production dependencies.

The repository does not yet include Playwright visual/e2e coverage, a load test, a volunteer rehearsal, or an automated accessibility audit. See [IMPLEMENTATION_AUDIT.md](./IMPLEMENTATION_AUDIT.md) for phase status and launch gates.
