# Cosmic Blueprint — Paid Report Platform

This is a large scope. I'll ship it in one coherent build, but breaking it into clear phases so you can see what's happening.

## Phase 1 — Auth gate & UI polish (Birth Details form)

- Rename form heading to exactly **"Birth Details"**.
- Add a prominent sign-in/sign-up notice card at the very top of the form, above all fields, explaining that authentication is required to generate reports.
- Hide the **Validate Chart** button from all non-admin users. Only visible when `has_role(uid, 'admin')` returns true.
- Block the Reports panel from generating anything unless the user is signed in with a real (non-anonymous) Google account. Show an inline "Sign in to continue" state instead.

## Phase 2 — Unified report catalog in the database

Move the report catalog from the static `reports-catalog.ts` file into a `report_products` table so the admin can edit price / visibility / access without code changes.

Schema:

```text
report_products
  id (slug, PK)          e.g. "natal-essence", "soul-purpose-activation-code"
  title, category, tagline, icon, adult (bool)
  price_cents (int)      admin-editable
  visible (bool)         hidden reports do not appear publicly
  enabled (bool)         disabled reports cannot be generated even if visible
  stripe_price_id (text) filled by admin "Sync to Stripe" action
  sort_order (int)
  created_at, updated_at

report_purchases
  id, user_id, report_id, stripe_session_id, stripe_payment_intent
  status ('paid' | 'refunded'), amount_cents, created_at

report_access_overrides
  user_id, report_id, granted_by, reason, created_at
  (admin can grant free access; admins themselves are always free)
```

Seed the table on migration with:
- All ~60 existing catalog entries (Core, Relationships, Growth, Timing, Vocation, Esoteric, Intimacy 18+, Patriotic Collection, Deep Personal).
- The 19 new reports from your list with the exact prices you provided.
- Tiered auto-pricing for any legacy report missing a price: light $19–29, standard $35–49, deep $59–79, flagship $89+.

`reports-catalog.ts` becomes the seed source only; runtime reads from the DB.

## Phase 3 — 19 new reports

Add the 19 new report definitions (Soul Purpose Activation Code … Daily Cosmic Alignment Ritual Guide) to the catalog with:
- Full expanded `systemFraming` per your spec (chart anchors, structured sections, long-form ~4000–6000 word targets so PDFs land at 20+ pages).
- Section lists tuned to each report (intro → interpretation → actionable → timing → rituals → integration).
- The exact prices you listed.

## Phase 4 — Stripe checkout & webhook

Uses the existing seamless Stripe integration (already enabled — `SRIPE_API_SECTRET_KEY` and `STRIPE_WEBHOOK` are in secrets).

- `POST /api/checkout/report` (auth-required server route): creates a Stripe Checkout Session for a given `report_id`, `success_url` back to `/reports/:id`, `cancel_url` back to `/`.
- `POST /api/public/webhooks/stripe`: verifies signature, on `checkout.session.completed` writes a row to `report_purchases`, then fires a Resend "purchase confirmation" email via the existing email service.
- Access check helper `userHasAccess(userId, reportId)`:
  1. Admin role → true
  2. Access override row → true
  3. Paid purchase row → true
  4. Report price = 0 → true
  5. Otherwise false
- `generateAstroReport` server fn and the MCP `generate_report_pdf` tool both call this check before generating.

## Phase 5 — Public report listing & paywall UI

- New `/reports` route: lists every `visible` report from the DB, grouped by category, with price badges and lock icons for unpurchased items.
- Clicking a locked report → "Unlock for $X" button → Stripe Checkout.
- Clicking an unlocked report → generates and downloads the PDF (existing flow).
- Hidden reports never appear.

## Phase 6 — Admin dashboard

New `/admin/reports` route (admin-only, guarded by `has_role`):
- Table of every report: title, category, price (inline editable), visible toggle, enabled toggle, stripe price id, adult flag.
- Bulk actions: hide all in category, set tier pricing.
- Grant free access to a specific user for a specific report.
- Link to existing `/admin/emails` dashboard.

Also expose the admin-only **Validate Chart** action here so it's off the public form.

## Phase 7 — Notifications

Reuse `src/lib/email/service.server.ts`:
- On successful Stripe webhook → send "Purchase confirmation" email with receipt + link.
- On report PDF generation success → send "Your report is ready" email with signed download URL.

## Phase 8 — Verification

End-to-end check with Playwright on localhost:
1. Anonymous user visits `/` → sees the sign-in notice, form is visible but Generate is blocked.
2. Sign-in flow → user lands back on form.
3. Free/legacy priced report → checkout redirect works (Stripe test mode).
4. Admin login → sees Validate Chart, sees `/admin/reports` with all rows.
5. Hidden report → does not appear in `/reports` list.
6. Webhook simulator (`stripe trigger checkout.session.completed`) → access unlocks, email log row created.

---

## Technical notes (for reference)

- Migrations: `report_products`, `report_purchases`, `report_access_overrides` tables + RLS. Seeded via a single migration.
- All price edits and visibility toggles go through authenticated server functions gated by `has_role(uid,'admin')`.
- Stripe: use the seamless Stripe key already configured. Admin "Sync prices to Stripe" action creates/updates Stripe Products & Prices for reports without a `stripe_price_id`.
- Webhook signature verification uses `STRIPE_WEBHOOK` secret already in the project.
- No frontend logic decides access — the server function is the single source of truth.

---

## One clarifying question before I start

Given the scope (DB migration, 19 large report definitions, Stripe checkout + webhook, admin dashboard, paywall UI, email hooks, tests), this is a big multi-file build that will take significant credits. Two options:

1. **Ship everything above in one build** (recommended — the pieces are tightly coupled; splitting causes rework).
2. **Ship in slices**: (A) auth gate + form polish + 19 new reports first, then (B) Stripe paywall + admin dashboard, then (C) email notifications + tests.

Reply "all" for #1, or "phase A" / "phase B" / "phase C" for #2.
