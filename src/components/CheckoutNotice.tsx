import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";
import { getCheckoutNotice } from "@/lib/reports/checkout-notice.functions";
import { DEFAULT_CHECKOUT_NOTICE, showsCheckoutNotice } from "@/lib/reports/checkout-notice";

export function useCheckoutNotice() {
  const read = useServerFn(getCheckoutNotice);
  const query = useQuery({ queryKey: ["checkout-notice"], queryFn: () => read(), refetchInterval: 15000, staleTime: 0 });
  return { ...query, settings: query.data?.settings ?? DEFAULT_CHECKOUT_NOTICE };
}

export function CheckoutNotice({ surface }: { surface: "site-wide" | "report-checkout-only" }) {
  const { settings } = useCheckoutNotice();
  if (!showsCheckoutNotice(settings, surface)) return null;
  return (
    <aside role="status" aria-label="Checkout availability" className="border-y border-gold/30 bg-background/95 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
        <p className="text-sm leading-relaxed text-foreground break-words">{settings.message}</p>
      </div>
    </aside>
  );
}