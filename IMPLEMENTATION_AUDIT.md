# Project brief phase audit

Assessment against `PROJECT_BRIEF.md`, with Supabase as the PostgreSQL host. This audit reflects repository code only; it does not claim that production credentials, migrations, payment accounts, or event-day operations have been exercised.

## Phase status

| Phase | Status | Implemented in the repository | Remaining work / launch gate |
|---|---|---|---|
| 0 — foundation | **Mostly complete** | Next.js/TypeScript app, design tokens, Drizzle schema and versioned migrations, CI unit/type/dependency checks, Supabase pooler/direct URL guidance, environment template, content manifest. | No Playwright reference screenshots/diff artifacts. Apply migrations to Supabase and confirm production connection/permissions. |
| 1 — registration launch | **Partial; not ready for public launch** | Marketing pages, registration flow, group-seat invite claims, Paystack/PayPal adapters and signed webhooks, ticket QR/access page, recovery, paid-order exports, audit records, maintenance reconciliation, Turnstile, server-side pricing, checkout idempotency and deadline/capacity checks, transactional SMS/email outbox, retry worker, admin dead-letter/retry screen. | Run a real low-value payment and settlement test for each provider; configure live keys/webhooks and confirm Paystack currency support; bank transfer submission/account details are absent; backup schedule and restore test are not verified; privacy/legal copy and map/directions need owner review. |
| 2 — on-site operations | **Partial** | Staff login with Argon2id and required provisioned TOTP for admin/finance; role checks; scanner PWA shell, IndexedDB roster and pending scan queue, signed attendee/group QR, offline and atomic online check-in, booklet issue records, manual lookup/override audit, walk-in cash/POS flow, finance approval UI, admin orders/attendees/booklet/conflict screens. | Manual-transfer submission is not implemented; stand/day stock allocation and live inventory enforcement are not configured; staff/role and device management/revocation screens are missing; append-only audit search UI, substitution flow, programme CMS/CSV importer, per-stand dashboard and full reports are incomplete. |
| 3 — security and resilience QA | **Partial review; operational tests outstanding** | Static review fixes for private QR identifiers, webhook verification, exact amount/currency matching, admin MFA enrollment, rate limiting, CSRF origin checks, sensitive outputs, scanner sync idempotency, RLS/grants migration, security headers, and dependency audit. Unit crypto suite and application type/build checks are run separately. | No external penetration test, Playwright end-to-end or visual comparison, k6/Artillery load test, offline/sync chaos suite, 10-person/300-ticket rehearsal, accessibility audit, or tested backup restore. No Sentry/alert configuration. |
| 4 — event freeze and rehearsal | **Not started** | — | Freeze, live provider and on-site rehearsal, printed attendee/Plan B procedure, and event-day checklist remain organizer operations. |

## Security review findings and fixes

- Ticket tokens now sign opaque ticket IDs. New QR payloads do not embed attendee UUIDs; legacy v1 signatures remain accepted for already issued tickets.
- Checkout creation now takes a client idempotency key, checks configured prices on the server, enforces consent, reserves configured capacity transactionally, and rejects requests after the registration deadline. Event defaults are seeded by migration.
- Paystack and PayPal notifications are signature checked and then re-verified with the provider. Fulfillment requires a matching local payment, reference, currency, and amount; PayPal requires a completed capture ID.
- Admin/finance access requires Argon2id password verification and TOTP provisioned outside the login flow. Session cookies are httpOnly, sameSite, and secure in production.
- Scanner APIs validate inputs, rate limit operations, restrict data to paid attendees, and make online/offline check-in idempotent. Offline roster responses omit phone and email.
- Payment fulfillment, finance approval, and walk-in registration enqueue channel-specific ticket messages in their database transaction. The cron worker retries failures up to eight times, recovers stale locks, and exposes dead letters to admins for audited retry. Provider delivery is at-least-once, so a crash after provider acceptance can produce a duplicate message.
- Migration `0002_payment_checkout_url` adds Supabase row level security and revokes `anon`/`authenticated` table grants for application tables. **This migration has not been applied to the connected Supabase project in this review.** Apply it before deployment and confirm the server database role still has access.
- Production rate limiting fails closed without working Upstash credentials. HTTPS headers include HSTS and CSP in production.

## Content and image review

- The Why Attend collage uses the supplied `crowd-bw.jpg` as its second photo; its first flyer image is aligned in the mobile grid. Flyer reuse is the only intentional repeated campaign image.
- Home campaign photos are distinct across hero, Why Attend, CTA, About collage, minister profiles, and details. The Ministers page uses a separate Pastor Paul Rika portrait and a clearly labeled placeholder for Evang. Linda Paul Rika.
- **One new image is needed:** a second, unique Evang. Linda Paul Rika portrait for the Ministers page. Her current photo is already used in the Home minister section. There is no other section currently waiting on a photo; the open Camp Info item is a map pin and directions, not an image.
- The original YouTube, Facebook, and X links are configured in the shared site config and used throughout the public header, footer, ministers, and About preview.
- Unconfirmed travel directions, ministry biography, theme exposition, schedule items, stand names, booklet quantities, and legal claims were removed or replaced with labeled placeholders.

## Work required before launch

1. Provide owner-approved About Horemow copy, minister bios, theme exposition, map pin/directions, official privacy/refund text, privacy contact, manual transfer bank details, unique Linda portrait, and stand/day booklet counts.
2. Apply Supabase migrations using `MIGRATION_DATABASE_URL`; verify RLS is enabled and test that the server pooler role works while Supabase browser roles cannot read attendee/payment/staff tables.
3. Configure Turnstile, Upstash, production Ed25519 keys, provider credentials and webhook URLs. Verify all four price routes and perform one live test payment per active provider.
4. Configure and monitor the durable notification worker; complete admin staff/device/audit management, manual transfer submission, stock allocation enforcement, programme editing/import, and any requested substitution workflow.
5. Complete the Phase 3 and Phase 4 drills listed above, including load/chaos tests and an actual Supabase backup restore.

## QA evidence and scope

- `pnpm build` passed and generated all 40 routes, including the messaging dead-letter screen and retry API.
- `pnpm test` passed: 3 test files, 11 tests. `node_modules/.bin/tsc --noEmit`, `node --check public/sw.js`, and `git diff --check` passed.
- `pnpm audit --prod --audit-level high` reported no known production dependency vulnerabilities.
- Migration journal/snapshot JSON parses and the snapshot `prevId` chain matches the journal. `drizzle-kit check` could not run in this Windows environment because its runtime exited with `uv_os_get_passwd returned ENOMEM`.
- No migration was applied to Supabase, and no live provider payment/delivery or RLS permission probe was run. Static repository checks cannot prove settlement, provider delivery, restore recovery, production performance, or protection against an external attacker.
