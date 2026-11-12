# Final QC audit: Cosmic Insights Pro (read-only)

Nothing was edited, migrated, emailed, charged or published.

## Checks run
- `bunx tsgo --noEmit`: PASS (exit 0, no diagnostics)
- `bunx vitest run src/lib/email`: PASS (2 files, 37/37 tests)
- `bun run build`: NOT RUN. Plan mode does not allow builds because they write output files. Approving this plan runs the build only; no code changes.

## Checklist
| Area | Result | Evidence |
|---|---|---|
| Manual report-ready email idempotency | PASS, with a note | `generate-report.functions.ts:203-210`: the key is built from user, report and `generatedAt`, so each generation gets exactly one email. Regenerating the same report creates a new key and sends a new email, which is the intended behavior. The lifecycle event (`:189`) uses `Date.now()` and has no idempotency. |
| email_outbox schema | WARN | `0003_harden_report_email_delivery.sql:2-16`: the idempotency key is unique, the table is service-only and RLS is on. `status` is free text with **no CHECK constraint**. |
| email_send_log status | WARN | `status` is also unconstrained text. Values written: pending, sent, uncertain, requires_attention (`outbox.server.ts:22-52`). |
| Retry/claim | PASS | `claim_outbox_email` (`0003:18-28`) is an atomic UPDATE with a 5-minute backoff and a 23-hour cutoff. Execution is revoked from anon and authenticated. The client-side `replayDecision` matches it (`delivery-policy.ts:10-16`). A crashed send in the `sending` state becomes retryable after 5 minutes using the same key. |
| Purchase receipt retry | PASS, with a note | `purchase.server.ts:150-178`: the stable key is `purchase_receipt:orderId:reportId`. If sending fails, the code throws so the webhook retries, and `email_sent_at` is set only after a confirmed send. Note: on that retry, `enqueueDeliveries` (`:142`) runs again. I haven't checked whether it skips report deliveries that are already queued. |
| Admin delivery query/auth | PASS | `admin/purchases.functions.ts:6-7,91-97`: protected by `requireSupabaseAuth` and the server-side `isAdminUser` check. Note: the select includes `pdf_path` and `last_error`; I haven't checked whether the returned data strips them, as `AGENTS.md` requires. |
| Stripe webhook preserved | PASS | `api/public/webhooks/stripe.ts:19-31` verifies the signature, `:43-44` skips duplicate events, and `:50-52` checks payment status. |
| Build/type errors | PASS (typecheck); build pending | See above. |
| Security scan | ignored only, not fixed | The finding `lov_db_rls_tautology_permissive_v1_9dc44978b5c73f95` (public read access to checkout_notice_settings) was marked ignored, with no code change. No other findings are active in lov_pgscan, app_mcp or supply_chain. The agent_security deep scan is out of date and its status is unknown. |

## Blockers
- No hard blockers found.
- Still open: the production build result.
- Recommended follow-ups (not done): add CHECK constraints on outbox/send-log status; confirm `enqueueDeliveries` skips already-queued deliveries; confirm the admin delivery data drops `pdf_path`/`last_error`; run a fresh deep security scan.

## On approval
Run `bun run build` only and report its result. Make no other changes.
