-- Reconcile three published $99 reports to their already-existing live Stripe products/prices.
-- This migration does not create or modify any Stripe catalog objects or report prices.
-- It updates only the Stripe IDs, and fails closed unless all three expected rows match.

do $$
declare
  updated_count integer;
begin
  update public.reports as r
  set
    stripe_price_id = mapping.stripe_price_id,
    stripe_product_id = mapping.stripe_product_id
  from (
    values
      (
        'unfiltered-ambition-autopsy',
        'The Ambition Autopsy™',
        'price_1UCynOAf6sEE4moKEUpgcwUN',
        'prod_VDPcjGHttPqkCy'
      ),
      (
        'unfiltered-brutal-blueprint',
        'The Brutal Blueprint™',
        'price_1UCynIAf6sEE4moKk4cjRURS',
        'prod_VDPccLOLBmcW4U'
      ),
      (
        'unfiltered-unspoken-contract',
        'The Unspoken Contract™',
        'price_1UCynMAf6sEE4moKIAjFnHVP',
        'prod_VDPcw1XpxWFFK8'
      )
  ) as mapping(report_id, expected_title, stripe_price_id, stripe_product_id)
  where r.id = mapping.report_id
    and r.title = mapping.expected_title
    and r.is_published = true
    and r.is_free = false
    and r.price_cents = 9900
    and upper(coalesce(r.currency, 'USD')) = 'USD'
    and (
      r.stripe_price_id is null
      or btrim(r.stripe_price_id) = ''
      or r.stripe_price_id not like 'price_%'
    );

  get diagnostics updated_count = row_count;

  if updated_count <> 3 then
    raise exception
      'Stripe mapping reconciliation aborted: expected 3 exact report matches, updated %.',
      updated_count;
  end if;
end
$$;
