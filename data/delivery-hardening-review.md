# Production delivery hardening review

## Durable email safety
- `purchase_receipt` keys use template + purchase UUID + report ID. `report_ready` keys use template + purchase UUID + report ID (manual generation uses its generation identity).
- The service-only `email_outbox` stores the first exact payload, including the private signed URL. Atomic claims prevent simultaneous sends and enforce a five-minute minimum retry interval. Provider requests use Resend SDK `{ idempotencyKey }` options.
- Resend retains idempotency keys for **24 hours**. Automatic replay stops at **23 hours** from the first attempted send, allowing a safety margin. Unknown outcomes, including transport failures or a crash after provider acceptance, replay only the identical payload and key inside that window. Outside it, the email becomes `requires_attention`; **do not reset the key or send a replacement without checking the provider's delivery record**. This prevents duplicates but may require manual reconciliation rather than guarantee delivery.
- One email audit row is reused per logical email. Existing confirmed purchase/delivery `email_sent_at` records remain authoritative and skip sending. Existing rows with missing names greet the customer as “friend”.
- Alerts use their own durable keys by delivery/purchase + report + failure class. Alert failures are recorded without recursive alerts. If Resend itself is unavailable, email alerts cannot reach administrators; check `/admin/emails` and `/admin/purchases` directly.

## Preserved payment and privacy boundaries
- Stripe webhook handler is unchanged: raw-body `constructEventAsync`, Stripe signature header and SubtleCrypto verification, completed-event lookup before fulfillment, and completion marker only after fulfillment succeeds.
- Fulfillment still requires payment mode and `paid` or `no_payment_required`. Product IDs, price IDs, prices, entitlements, dashboard endpoint configuration, cron schedule/token, PDF bucket privacy, and seven-day signed links are unchanged.
- Enqueue failures and receipt failures now leave webhook processing incomplete so Stripe's existing retry behavior can retry safely. Already granted access is not revoked or changed. After Stripe stops retrying, unresolved receipts require administrator attention; no new scheduler was introduced.
- Administrator delivery records exclude chart snapshots, birth details, private paths, signed URLs, and raw provider errors. Alert bodies contain identifiers, classified safe errors, and an administrator page link only.

## Activation / manual review
- Additive migration adds nullable `report_purchases.customer_name` plus the service-only outbox and atomic claim function. It is applied to the shared project database; old published code remains compatible until reviewed code is published separately.
- No secret or webhook changes are required. Existing Resend credentials/from address continue unchanged. Optional `RESEND_ADMIN_EMAIL` changes only the failure-alert recipient; default support and alert contact is `oracle@mycosmicblueprint.online`.
- Review the diff, then explicitly publish when ready. No payment test or live send was performed during this change. Validate a genuine future customer order after publication without changing Stripe configuration.