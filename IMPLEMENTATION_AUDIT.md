# Project brief phase audit

Assessment against `PROJECT_BRIEF.md`, with Supabase as the PostgreSQL host. This audit reflects repository code only; it does not claim that production credentials, migrations, payment accounts, or event-day operations have been exercised.

## Phase status

| Phase | Status | Implemented in the repository | Remaining work / launch gate |
|---|---|---|---|
| 0 — foundation | **Mostly complete** | Next.js/TypeScript app, design tokens, Drizzle schema and versioned migrations, CI unit/type/dependency checks, Supabase pooler/direct URL guidance, environment template, content manifest. | No Playwright reference screenshots/diff artifacts. Apply migrations to Supabase and confirm production connection/permissions. |
| 1 — registration launch | **Partial; not ready for public launch** | Marketing pages, registration and group-seat claims, Paystack/PayPal adapters and signed webhooks, ticket QR/access, recovery, exports, audit records, maintenance reconciliation, Turnstile, server-side pricing, idempotency/capacity/deadline checks, transactional SMS/email outbox and retry UI. NGN manual transfer now has organizer-configured bank details, signed order access, audited submission, server-derived amount, and finance approval against the bank statement. | Owner must supply bank details and legal/contact/venue content. Configure live keys/webhooks and verify Paystack currency support. Run one live low-value payment and settlement per enabled provider. Configure Supabase backups and complete a restore drill. |
| 2 — on-site operations | **Partial; online/offline scanner and inventory paths are implemented** | Staff login with Argon2id and required provisioned TOTP for admin/finance; role checks; scanner PWA, IndexedDB roster and proof-carrying pending queue, signed individual/group QR, atomic online/offline check-in, booklet issue stock enforcement, stand/day allocation and return UI, manual lookup/override audit, walk-in flow, finance approval, order/attendee/conflict/stock screens. | Staff/role and device administration/revocation UI, searchable audit-log UI, admin programme management/CSV import, dashboard charts/threshold alerts, and richer per-stand reporting remain. Supply confirmed stand names and booklet quantities. Name-transfer self-service is explicitly deferred in the brief; the manual contact policy needs owner approval. |
| 3 — security and resilience QA | **Static/unit review complete in part; operational tests outstanding** | Review fixes include server verification of signed QR proofs on online check-in and offline sync, signed group-order proof, stock checks in the same transaction as booklet issuance, webhook/amount/currency verification, admin MFA, rate limits, same-origin writes, RLS/grant migrations, and security headers. Current unit suite covers 13 cases; TypeScript, build, service-worker syntax, migration snapshot chain, and diff checks pass. | No external penetration test; Playwright E2E/visual regression; double-scan and PayPal-pending integration tests against a database/provider sandbox; k6/Artillery load test; offline/sync chaos suite; 10-person/300-ticket rehearsal; WCAG/Lighthouse audit; or tested Supabase restore. Sentry/production alerts are not configured. |
| 4 — event freeze and rehearsal | **Not started** | — | Freeze, live provider and on-site rehearsal, printed attendee/Plan B procedure, and event-day checklist remain organizer operations. |

## Security review findings and fixes

- Ticket tokens now sign opaque ticket IDs. New QR payloads do not embed attendee UUIDs; legacy v1 signatures remain accepted for already issued tickets.
- Checkout creation now takes a client idempotency key, checks configured prices on the server, enforces consent, reserves configured capacity transactionally, and rejects requests after the registration deadline. Event defaults are seeded by migration.
- Paystack and PayPal notifications are signature checked and then re-verified with the provider. Fulfillment requires a matching local payment, reference, currency, and amount; PayPal requires a completed capture ID.
- Admin/finance access requires Argon2id password verification and TOTP provisioned outside the login flow. Session cookies are httpOnly, sameSite, and secure in production.
- Scanner APIs validate inputs, rate limit operations, restrict data to paid attendees, and make online/offline check-in idempotent. Offline roster responses omit phone and email.
- Online scanner actions now accept the signed ticket QR itself, verify its Ed25519 signature on the server, and match its SHA-256 hash to the attendee record. Offline sync accepts an individual ticket proof or a signed group-order proof and rejects unproven attendee IDs. Short reference codes remain for supervisor lookup and do not authorize automatic check-in.
- Booklet stock is allocated once per stand and Africa/Lagos date. Online and offline booklet issuance lock the allocation and increment stock in the same transaction as attendee state; offline issues that arrive after an allocation is exhausted become visible conflicts. Stock returns and allocation changes are audited.
- Manual transfer checkout is NGN-only, enabled only when all bank details are configured, and expires after 24 hours. Submission records the server-side order amount; the attendee cannot mark an order paid or upload a receipt. Finance approval remains a separate, audited action.
- Payment fulfillment, finance approval, and walk-in registration enqueue channel-specific ticket messages in their database transaction. The cron worker retries failures up to eight times, recovers stale locks, and exposes dead letters to admins for audited retry. Provider delivery is at-least-once, so a crash after provider acceptance can produce a duplicate message.
- Migration `0002_payment_checkout_url` adds Supabase row level security and revokes `anon`/`authenticated` table grants for application tables. **This migration has not been applied to the connected Supabase project in this review.** Apply it before deployment and confirm the server database role still has access.
- Production rate limiting fails closed without working Upstash credentials. HTTPS headers include HSTS and CSP in production.

## Content and image review

- The Why Attend collage uses the supplied `crowd-bw.jpg` as its second photo; its first flyer image is aligned in the mobile grid. Flyer reuse is the only intentional repeated campaign image.
- Eleven raster campaign assets now have generated WebP derivatives in `public/images/optimized`; these total 2,332,112 bytes versus 3,991,715 bytes for their source assets (41.6% smaller). Next Image is configured for AVIF/WebP delivery and responsive sizes. The official flyer is retained at high quality for legible small text.
- Home campaign photos are distinct across hero, Why Attend, CTA, About collage, minister profiles, and details. The Ministers page uses a separate Pastor Paul Rika portrait and a clearly labeled placeholder for Evang. Linda Paul Rika.
- **One new image is needed:** a second, unique Evang. Linda Paul Rika portrait for the Ministers page. Her current photo is already used in the Home minister section. There is no other section currently waiting on a photo; the open Camp Info item is a map pin and directions, not an image.
- The YouTube, Facebook, and X links supplied by the owner are configured in the shared site config and used throughout the public header, footer, ministers, and About preview.
- Unconfirmed travel directions, ministry biography, theme exposition, schedule items, stand names, booklet quantities, and legal claims were removed or replaced with labeled placeholders.

## Work required before launch

1. Provide owner-approved About Horemow copy, minister bios, theme exposition, map pin/directions, official privacy/refund text, privacy contact, manual transfer bank details, unique Linda portrait, and stand/day booklet counts.
2. Apply Supabase migrations `0000` through `0005` using `MIGRATION_DATABASE_URL`; verify RLS is enabled and test that the server pooler role works while Supabase browser roles cannot read attendee/payment/staff tables.
3. Configure Turnstile, Upstash, production Ed25519 keys, provider credentials and webhook URLs. Verify all four price routes and perform one live test payment per active provider.
4. Configure and monitor the durable notification worker; complete admin staff/device and audit-log management, programme editing/import, dashboard charts and threshold reports. Name-transfer self-service is deferred by the project brief.
5. Complete the Phase 3 and Phase 4 drills listed above, including load/chaos tests and an actual Supabase backup restore. Use [EVENT_DAY_RUNBOOK.md](./EVENT_DAY_RUNBOOK.md) for the rehearsal.

## QA evidence and scope

- `pnpm build` passed and generated 43 app/API routes, including the manual transfer page/submission and scanner stock API.
- `pnpm test` passed: 4 test files, 13 tests. `node_modules/.bin/tsc --noEmit`, `node --check public/sw.js`, `git diff --check`, and validation of the six-migration snapshot `prevId` chain passed.
- A fresh `pnpm audit --prod --audit-level high` attempt could not reach `registry.npmjs.org` (`EACCES`) and was stopped after retries began. The dependency audit in the previous review reported no known production vulnerabilities; this change retains the same Sharp version.
- `drizzle-kit check` could not run in this Windows environment because its runtime exited with `uv_os_get_passwd returned ENOMEM`.
- No migration was applied to Supabase, and no live provider payment/delivery or RLS permission probe was run. Static repository checks cannot prove settlement, provider delivery, restore recovery, production performance, or protection against an external attacker.
