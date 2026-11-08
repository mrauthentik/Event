# MASTER BRIEF: Horemow International Holiness General Conference 2026 — Registration, Ticketing & Check-in System

(Single source of truth. Supersedes all earlier drafts and addenda.)

## 0. HOW YOU MUST WORK
- This brief is long. Do NOT build everything in one pass. First produce an implementation plan (architecture, folder structure, DB schema, page list, risks, open questions) and WAIT for my approval. Then build phase by phase (section 15), stopping at the end of each phase for review.
- Never invent content. Wherever copy, a photo, a name, a price or a date is missing, render a clearly labelled placeholder (e.g. a grey box: "PHOTO NEEDED: hero, 1920x1080, people worshipping") and log it in CONTENT_REQUESTS.md (page, slot, type, dimensions). No lorem ipsum, no filler copy, no stock-looking people. At the start of each phase, give me the batch of content you need for that phase.
- Reference screenshots are in /design-reference (KILO seminar site). They are the visual source of truth for layout and styling.
- This is a real church event with real money and about 10,000 attendees. Favour correctness, security and resilience over cleverness.
- Today is 8 Nov 2026. The event starts 8 Dec 2026. Follow the phased plan so registration goes live as early as possible.

## 1. PROJECT FACTS (CONFIRMED)
- Ministry: Holiness Revival Movement Worldwide (Horemow), Non-denominational. Short brand name: "Horemow".
- Event title: International Holiness General Conference 2026
- Theme: "Man and Satan in Contention Against the Holy God"
- Dates: Tuesday 8 December to Friday 11 December 2026. Timezone Africa/Lagos (WAT, UTC+1).
- Start: 8 Dec 2026, 4:00 PM WAT. Countdown target: `2026-12-08T16:00:00+01:00`.
- Venue: Holiness Campground, behind FGC, Kwali, Abuja, Nigeria. [Map pin and directions: TBD]
- Contact phone: +234 701 566 8452 (render as tel: link and a WhatsApp link). Contact email: NONE YET (design every place an email appears so it can be added later via settings; never hard-code).
- Featured ministers: Pastor Paul Rika; Evang. Linda Paul Rika. More ministers TBD. Photos and bios TBD.
- Registration price (flat, every attendee, no category differences): NGN 5,000 | USD 20 | EUR 20 | GBP 20.
- Registration deadline: 11 December 2026 (closes automatically 23:59 WAT; admin can extend).
- Accommodation and meals: NOT included. Do not build accommodation/meal fields. Add a "Camp Info / What to bring" page and FAQ entries stating attendees arrange their own accommodation and food.
- Expected attendance: about 10,000, may be higher or lower. Treat 10,000 as a planning figure, NOT a hard cap.
- Registration mix: about 30 to 50% group (church/parish) orders, rest individuals.
- Programme: not available yet. The programme booklet arrives on 8 Dec 2026.
- Logo: will be supplied. Use a placeholder lockup until then.
- Network at camp is unreliable; scanner must work offline. Registrants on mobile data may have slow or dropping connections.
- Ref code format: `HGC-XXXXXX` (6 chars, unambiguous alphabet, no 0/O/1/I).
- Copyright line: "Copyright (c) 2026 Holiness Revival Movement Worldwide (Horemow). All Rights Reserved."

## 2. ENGINEERING PRINCIPLES (NON-NEGOTIABLE)
1. Server is the source of truth for money, capacity and ticket state. Never trust the client.
2. Every retryable write (create order, webhook, check-in sync) is idempotent.
3. Separate WHO PAYS from WHO ATTENDS: Order (payer) -> many Attendees (each with own QR).
4. An individual is just an order with one attendee. One flow, not two.
5. Model state as explicit state machines, not scattered booleans.
6. Boring architecture: one well-structured monolith, managed services, no microservices, no Kubernetes.
7. Everything configurable (prices, currencies, provider routing, capacity, fee policy, dates, deadline, contact details, programme, ministers) lives in DB/settings, not code.
8. Design for failure: gateway down, webhook late, SMS lost, phone dead, internet gone.

## 3. TECH STACK
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS with a custom design-token layer. shadcn/Radix only as unstyled behaviour, fully restyled to the design system (nothing may look like default shadcn).
- PostgreSQL (managed: Neon or Supabase), Drizzle ORM (or Prisma), versioned migrations. Money as integer minor units (kobo/cents/pence), never floats; always store currency alongside amount.
- Redis (Upstash) for rate limiting and short-lived reservations. Durable job queue (Inngest, Trigger.dev or BullMQ) for SMS, email, PDFs, webhook processing, reconciliation.
- Payments: Paystack (NGN) and PayPal (USD/EUR/GBP). See section 8.
- SMS: Nigeria-friendly provider behind an interface (e.g. Termii). Email: transactional provider behind an interface (Resend, Postmark or ZeptoMail), with SPF/DKIM/DMARC documented. Email is optional for registrants (see 6.1).
- Bot protection: Cloudflare Turnstile.
- Staff/admin auth: Auth.js or Lucia, Argon2id, mandatory TOTP 2FA for admin and finance roles.
- Validation: Zod on every input, shared client/server.
- Observability: Sentry, structured logs, health endpoint, alerts on failed webhooks/jobs.
- PWA scanner: Serwist, Dexie/IndexedDB, BarcodeDetector API with ZXing-wasm fallback.
- Hosting: Vercel or equivalent + CDN. Self-host fonts via next/font. Images AVIF/WebP, responsive sizes.
- Testing: Vitest (unit), Playwright (e2e and visual regression vs /design-reference), k6 or Artillery (load).

## 4. DESIGN SYSTEM (PIXEL-PERFECT FROM THE INSPIRATION)
Goal: looks hand-designed by a good studio, NOT AI-generated. Replicate the KILO layout language exactly, then extend it to all other pages using the same rules.

### 4.1 Method
- Treat screenshots as ~1440px-wide desktop designs scaled down. Infer real sizes proportionally; confirm ambiguities with me.
- Before components, create /design-tokens (CSS variables + Tailwind theme): colours, type scale, spacing (4px base), radii, shadows, breakpoints. Sample exact hex values from the screenshots. Starting approximations: mint #8EE3D6, deep navy #0E1020, footer bar #171A2B, ink #111320, muted grey #6B7280, soft mint border #CDEFEA. Brand colours must be swappable from one file in case Horemow supplies its own palette or the logo requires it.
- Build each section, render at 1440px with Playwright, compare with the reference (overlay diff), iterate until spacing, sizes, alignment and radii match. Store diffs in /design-reference/diffs.
- Then build tablet (768) and mobile (390). The inspiration has no mobile design, so adapt the same language. Registration flows are mobile-first because most users are on phones.

### 4.2 Typography
- Headings: Montserrat (Bold/SemiBold), line-height about 1.1, slightly negative tracking on large sizes. Body: Inter or whichever neutral sans best matches the screenshots (compare glyphs, decide, tell me). Labels (countdown units, minister role): uppercase, 0.08 to 0.12em tracking, 9 to 11px.
- Approx scale at 1440: hero H1 44 to 48px bold; section H2 32 to 36px bold; body 14 to 15px / 1.7 muted grey; nav/meta 12px.
- Tabular numerals for the countdown.

### 4.3 Component specs (derive exact values from the screenshots)
- Header: slim white bar (~55px). Centered logo. Left: four small circular light-grey social icon buttons. Right: mail and phone circular icons (mail icon hidden until an email is configured). Mobile: logo + menu button; keyboard-accessible drawer.
- Hero: full-bleed photo with dark navy overlay gradient. Text block on the RIGHT half: small calendar icon + date, bold white H1 (max 3 lines), live countdown (Days : Hours : Minutes : Seconds) with large semibold numerals, tiny uppercase labels, thin colon separators, then an outlined pill button (1px white border, transparent, white text) reading "Register Now". Countdown is timezone-safe (fixed ISO timestamp with offset), hydration-safe, no flash of wrong values. After the start, switch to "Conference is live" state, and after 11 Dec to a "Thank you" state (settings-driven).
- Filled mint pill button: fully rounded, mint background, ~14px semibold. The reference has weak contrast (white on mint): keep the look, use dark navy text on mint to pass WCAG AA.
- Bullet lists: small mint arrow-chevron markers.
- Image compositions: rounded images overlapped and offset, one with a chamfered/clipped corner (see "Why Attend"), thin mint outline frames behind collages, video thumbnail with white circular play button over mint tint (About). Use CSS clip-path and layered positioning, not flattened images.
- Minister card: large card ~24px radius, very soft shadow, image left half full-bleed, right side name (bold), role in small uppercase mint-teal, short bio, circular outlined social icons.
- CTA banner: photo with dark teal overlay, mint triangle bottom-left, dark triangle right, centered bold white heading, mint pill button.
- Details card (home "Seminar Details" slot): wide white card, thin border, soft shadow: image left, title + theme in the middle, vertical divider, right column icon rows (date, time 4:00 PM, location), bottom light-grey strip with square share button left and mint pill right. No fake bullet points: use the real theme and facts only.
- Registration card: compact white card with logo on top, light-grey inputs (~6px radius, small floating labels), currency selector, strong full-width dark "Pay NGN 5,000" button with lock icon. On the Register page this card overlaps the hero's lower edge like the reference.
- Price card: compact card with mint border showing price per currency and a "View details" link.
- Footer: deep navy, three columns (logo + blurb / social links / related info cards with outlined pill buttons), lighter copyright bar.
- Icons: ONE outline icon set (Phosphor or Lucide, 1.5px stroke). No emoji icons.
- Motion: restrained. Fade/translate on scroll (200 to 400ms ease-out), hover states, countdown tick. Respect prefers-reduced-motion. No parallax gimmicks or particles.

### 4.4 "Does not look AI-made" rules
- No purple/blue gradient blobs, glassmorphism, generic three-equal-cards-with-emoji sections, or centered-everything layouts. Use the asymmetric compositions from the reference.
- Consistent spacing rhythm (section padding multiples of 8). 12-column grid, ~1100 to 1200px content width.
- Real, specific copy only (from me). Reverent, warm tone suited to a Christian conference.
- Photography with consistent treatment (same overlay, same radius). Never use stock people.
- Every interactive element has designed hover, focus-visible, active, disabled and loading states. Every form has designed error and empty states.
- No default browser/Tailwind/shadcn styling visible anywhere (selects, date pickers, checkboxes, toasts, scrollbars).

## 5. SITEMAP
Public: Home; About Horemow; The Conference (theme, what to expect); Programme (day tabs 8, 9, 10, 11 Dec, see 5.1); Ministers; Register (individual or group); Group registration landing; Camp Info / What to Bring; FAQ; Contact; Privacy Policy; Terms and Refund Policy (draft, see 5.2).
Utility: Payment status page (polling); My Ticket (QR, download PNG/PDF); Resend My Ticket; Group Leader Dashboard; Group Member Invite page; branded 404/500.
Staff: Login; Scanner (PWA); Walk-in registration; Lookup.
Admin: Dashboard; Orders; Attendees; Groups; Manual payment approvals; Staff and roles; Devices; Booklet stock; Messaging; Reports/exports; Conflicts; Audit log; Settings (event, prices per currency, provider routing, optional capacity and alert thresholds, fee policy, deadline, contact details, ministers, programme).

### 5.1 Ministers and Programme content rules
- Ministers page: admin-editable list (name, title, photo, bio, socials, order). Initial entries: Pastor Paul Rika; Evang. Linda Paul Rika (photos/bios placeholders). Include a designed "More ministers to be announced" card.
- Programme page: four day tabs (Tue 8, Wed 9, Thu 10, Fri 11 Dec) each with a designed empty state: "The full programme will be released at the conference." Do NOT invent sessions or times. Programme data is admin-editable (day, time, session, minister, description) with CSV import, because the booklet arrives on 8 Dec.

### 5.2 INTERIM refund and substitution policy (DRAFT, owner will finalize; keep all values configurable and mark the Terms page as DRAFT)
- Registration fees are non-refundable once payment is confirmed.
- Exceptions, refunded in full to the original payment method: duplicate payments; payment taken but no ticket issued because of a system error; cancellation of the event by the organisers.
- Name substitution is free until [DATE TBD, suggest 5 Dec 2026] via the group dashboard or by contacting the ministry. Substitutions are logged and the old QR is invalidated.
- All refunds are admin-approved, audit-logged, processed within [TBD] working days. Contact: +234 701 566 8452.

## 6. USER FLOWS
### 6.1 Individual
1. Select currency (default NGN for Nigerian users/+234 numbers; always switchable) -> short form: full name, phone (international input, default +234, E.164), country, state (Nigeria only), parish/church (optional), guardian name and phone if under 18, email (OPTIONAL but encouraged; required only when paying with PayPal), consent checkbox, Turnstile.
2. Server creates Order(pending_payment) + Attendee(unconfirmed), computes the amount from the price table, initialises the provider for that currency, redirects to hosted checkout. If an optional capacity is configured, also create a capacity reservation (10 to 15 min expiry); if capacity is unset, skip reservations.
3. On return, show the Payment Status page which polls OUR API (never trust redirect params). Confirmation only via verified webhook or server-side verification.
4. On success show the ticket with QR, download button, ref code (`HGC-XXXXXX`), and queue SMS (and email if provided). Showing the QR on screen is the primary delivery.

### 6.2 Group
1. Leader picks "Group registration", enters church/parish name, leader contact, number of attendees (single currency per order).
2. Leader either (a) enters every attendee's details, or (b) pays for N seats and shares an invite link; each member fills their own details to claim a seat. Partial completion supported.
3. One payment, one receipt. Each attendee gets own QR; the order also gets an ORDER QR for group express check-in.
4. Leader dashboard: seats, completion status, resend links, download all tickets as ZIP/PDF.
5. Substitution deadline configurable; all changes logged.

### 6.3 Failure recovery (must be excellent)
- "I paid but got no ticket": lookup by ref/phone/email -> button that queries the gateway directly and reconciles.
- Scheduled job reconciles pending orders every few minutes.
- Draft form state saved locally so a dropped connection never loses typed data.
- Unpaid orders expire. Paid-after-expiry cases are flagged for admin with an auto-refund option.
- Manual bank transfer (NGN only, and as foreign-currency fallback if PayPal is disabled; owner will supply account details): order stays pending, admin approves against the bank statement only (never from screenshots), audit-logged.

## 7. DATA MODEL (adjust sensibly, keep these concepts)
events; ticket_types; ticket_prices (ticket_type_id, currency, amount_minor) so any ticket type has a price per currency; provider_routes (currency -> provider, preferred flag, enabled); orders (status, payer, currency, total_minor, fee_minor, reference, expires_at); payments (provider, provider_ref/capture_id, status, currency, raw_payload_hash); webhook_events (id, provider, signature_valid, processed_at, idempotency); attendees (order_id, ticket_type_id, name, phone_e164, email nullable, country, state, parish, guardian fields, status, qr_token_hash, ref_code); groups; group_seats/invites; scan_events (attendee_id, type: arrival|booklet|daily_attendance|custom, staff_id, device_id, stand_id, client_timestamp, server_timestamp, idempotency_key, result); staff_users (attendant|supervisor|finance|admin); devices; booklet_stock (per stand/day); manual_payments; messages_log; audit_log (append-only); exports_log; reservations; ministers; programme_items; settings.
- Scan types are generic so meals/accommodation/daily attendance can be added later without schema redesign.
- Soft deletes. Indexes on ref_code, phone_e164, email, qr_token_hash, order status, expires_at.
- Order states: draft -> pending_payment -> paid | expired | failed -> refunded | partially_refunded (plus disputed flag).
- Attendee states: unconfirmed -> confirmed -> checked_in -> booklet_issued (booklet separate from check-in).

## 8. PAYMENTS AND WEBHOOKS
### 8.1 Providers (CONFIRMED: Paystack + PayPal; no Flutterwave)
- Implement a PaymentProvider interface with two adapters. Routing is data, not code: NGN -> Paystack; USD/EUR/GBP -> PayPal by default. The owner is asking Paystack whether USD/EUR/GBP are enabled on their account; if yes, allow either provider per currency via the routing table.
- Amounts are computed server-side only. References are generated by us and unique. Never log card data; store only provider references.

### 8.2 Paystack
- Server-side initialise, hosted checkout (card, bank transfer, USSD, bank). Verify HMAC SHA512 signature on the RAW body, store the event, re-verify the transaction via Paystack API, update state in a DB transaction. Idempotent. Return 200 fast, process via queue.

### 8.3 PayPal
- Use Orders v2: create order server-side, buyer approves on PayPal, capture server-side. Use PayPal-Request-Id for idempotency. Verify webhooks via PayPal's verify-webhook-signature endpoint, then re-fetch the order/capture from PayPal before marking paid. Key idempotency on the capture ID.
- Handle PENDING (held/under review), COMPLETED, DECLINED, REFUNDED. A PENDING capture must NOT issue a ticket until COMPLETED. Handle disputes/chargebacks by flagging the order and alerting admin (do not auto-delete tickets).
- Sandbox and live credentials strictly separated by environment.

### 8.4 Operations
- Admin "gateway health" switch per provider. If PayPal is disabled or failing, foreign-currency checkout shows "temporarily unavailable" with ministry contact and the manual transfer option.
- Fee policy (who absorbs fees) is a setting, per provider and currency.
- Finance view: daily reconciliation per provider and per currency, mismatches highlighted. NEVER sum different currencies.
- Runbook entry: PayPal balances can be held or limited; finance withdraws regularly and monitors for holds.
- LAUNCH GATE (Phase 1): one real small live payment per provider end to end (checkout -> webhook -> ticket -> settlement) BEFORE registration opens publicly.

## 9. QR AND TICKET SPEC
- QR contains ONLY an opaque signed token: random 128-bit ID + Ed25519 signature, base32/base64url, no PII, no sequential IDs. Server stores only a hash.
- Scanner devices hold ONLY the public key (a stolen device cannot forge tickets). The offline cache holds token hashes and minimal display data (name, category, group, booklet status), never full phone/email.
- Short ref code on every ticket for manual lookup.
- Ticket page/PDF: branded, high-contrast large QR, name, dates, venue, ref code, "Show this at the registration stand."
- Group ORDER QR opens a checklist of all attendees for one-transaction check-in.

## 10. STAFF SCANNER PWA (OFFLINE-FIRST)
- Installable PWA, camera-based, large touch targets, one-handed, sunlight-readable, screen kept awake.
- Pre-event sync of the attendee list into IndexedDB; delta-sync every few minutes when online. Clear online/offline/sync-pending indicator with queue size.
- Result screens: full-screen GREEN (valid: name, group, booklet status), RED (invalid/forged), AMBER (already checked in: when, by whom, which stand). Distinct sound and vibration. Result in about 1 second.
- Actions: Check in; Issue booklet (separate confirmed step); Undo (supervisor only, logged).
- Offline check-ins queue locally with client idempotency key and timestamp, then sync. On conflict (same attendee at two stands offline) first timestamp wins; the other is flagged in the admin Conflicts screen. Never silently drop.
- Online path atomic: `UPDATE ... WHERE id = X AND checked_in_at IS NULL`.
- Fallback lookup by name, phone or ref code; manual check-in needs supervisor PIN, reason, audit entry.
- Per-staff login, short sessions, PIN quick-unlock, instant device/account revoke. Optional stand slices (alphabet/group) to reduce offline overlap.
- Group express lane via ORDER QR.

## 11. ADMIN DASHBOARD
- Live counts: registered, paid, pending, checked in, booklets issued vs remaining (per stand/day), revenue PER CURRENCY, attendance vs configurable alert thresholds (e.g. 8,000 / 9,000 / 10,000). Charts: registrations over time, check-ins per hour.
- Orders/attendees tables: search, filters, pagination, bulk actions, resend ticket, edit attendee (logged), substitution flow.
- Manual payment approvals; walk-in registration (cash NGN, POS, or gateway link) that issues a ticket AND checks in in one flow.
- Conflict review; staff and roles with enforced 2FA for admin/finance; role-restricted, logged CSV exports; searchable append-only audit log.
- Settings: prices per currency, provider routing, optional capacity, fee policy, dates, deadline, contact details, messaging templates, ministers, programme.
- Dense, fast, keyboard-friendly UI, using brand tokens but not the marketing site's large type.

## 12. SECURITY REQUIREMENTS
- HTTPS only, HSTS, strict CSP, secure/httpOnly/sameSite cookies, CSRF protection, security headers.
- Server-side RBAC on every route/action. Least privilege.
- Rate limiting (IP + identifier) on registration, login, lookup, resend, payment-status. Turnstile on public forms. Generic lookup responses ("If this exists, we've sent a link") to prevent enumeration.
- Argon2id, mandatory TOTP for admin/finance, login throttling, session revocation.
- Secrets in environment variables only; test and live keys separate.
- Zod validation, output encoding, parameterised queries only.
- PII minimisation and retention: collect only what's needed, show purpose and consent, protect minors' data (guardian field), documented deletion/archive after the event. Nigeria Data Protection Act awareness; Privacy Policy page placeholder for my legal review.
- Append-only audit log for payments, approvals, overrides, exports, role changes, undo actions.
- Daily automated DB backups and a documented, TESTED restore.
- Dependency audit in CI.

## 13. RESILIENCE AND PERFORMANCE
- Targets: public pages LCP under 2.5s on slow 4G, minimal client JS on marketing pages, Lighthouse 90+ (mobile) on Performance/Accessibility/Best Practices/SEO.
- Hero image responsive, AVIF/WebP, preloaded, navy placeholder colour to prevent layout shift. Fonts self-hosted with swap and size-adjust fallback.
- Heavy work (SMS, email, PDF, ZIP) always in background jobs with retries and a dead-letter view. Registration requests never wait on them.
- Exponential backoff on gateway calls. Clear UI states for slow/failed requests.
- Stateless instances, indexed queries, connection pooling. Support a surge of 500 to 1,000 concurrent registrants.
- Optional capacity reservations with expiry and a release job.
- Always show the QR on screen right after payment so message delivery is never a single point of failure.

## 14. ACCESSIBILITY, CONTENT AND SEO
- WCAG 2.2 AA: contrast, focus-visible, labelled inputs, error summaries, keyboard-operable everything, semantic landmarks, alt-text slot for every photo, reduced-motion.
- Phone input: country picker, default +234, E.164, duplicate warning (warn, don't block).
- English, with copy structured for later i18n.
- Titles/meta, Open Graph image slot, sitemap.xml, robots.txt, Event structured data.

## 15. DELIVERY PHASES (event starts 8 Dec 2026)
- Phase 0 (days 1 to 2): plan, repo, CI, design tokens, fonts, DB schema, environments, content manifest.
- Phase 1 (days 3 to 10) GO LIVE ASAP: marketing site (Home, About, Conference, Programme empty state, Ministers, Camp Info, FAQ, Contact), Register (individual + group, multi-currency), Paystack + PayPal integrations with webhooks and reconciliation, ticket page + SMS (email optional), payment recovery flows, basic admin (orders/attendees/export), audit log, backups, monitoring, LAUNCH GATE (live test payment per provider).
- Phase 2 (days 11 to 20): staff auth, scanner PWA with offline queue, atomic check-in, booklet issuance, group express lane, walk-in registration, manual payment approvals, full admin dashboard, booklet stock.
- Phase 3 (days 21 to 26): security review, load tests, offline/sync chaos tests, mock check-in with about 10 volunteers and 300 fake tickets (duplicates, forged QR, dead phone, no internet), restore test, accessibility audit, pixel-level polish.
- Phase 4 (days 27 to 30): freeze, final rehearsal, printed "Plan B" attendee list and procedure sheet, on-site checklist.
- DEFERRED (do NOT build unless asked): waitlist, name-transfer self-service, WhatsApp delivery, local venue hub, wallet passes, Flutterwave.

## 16. DEFINITION OF DONE (per phase)
- Visually matches the reference at 1440/768/390 with diff screenshots attached.
- Unit + e2e tests pass, including: duplicate webhook, PayPal PENDING capture, double-scan race, expired reservation, offline sync conflict, forged QR rejected.
- No console errors, no critical a11y violations, Lighthouse targets met.
- README with setup, env vars, runbooks (webhook failure, payment mismatch, PayPal hold, restore backup, revoke device) and updated CONTENT_REQUESTS.md.

## 17. OPEN ITEMS (owner will supply; use placeholders until then)
Logo (SVG/PNG, light + dark); photos of Pastor Paul Rika and Evang. Linda Paul Rika and their bios; hero photo and About/Why-Attend photos; venue map pin and directions; social links; contact email (none yet); manual-transfer bank details; Paystack answer on USD/EUR/GBP; final refund policy and substitution date; About Horemow text; FAQ text; privacy text; programme booklet (8 Dec).

Begin with the implementation plan and your first batch of questions. Do not write feature code until I approve the plan.