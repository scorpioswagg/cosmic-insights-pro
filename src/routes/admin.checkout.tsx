import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Save } from "lucide-react";
import { getAdminCheckoutNotice, saveCheckoutNotice } from "@/lib/reports/checkout-notice.functions";
import { checkoutNoticeSchema, type CheckoutNoticeSettings } from "@/lib/reports/checkout-notice";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/checkout")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Checkout notice settings | Cosmic Blueprint" },
    { name: "description", content: "Manage the temporary Cosmic Blueprint checkout notice." },
    { property: "og:title", content: "Checkout notice settings | Cosmic Blueprint" },
    { property: "og:description", content: "Administrator checkout availability settings for Cosmic Blueprint." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CheckoutSettingsPage,
});

function CheckoutSettingsPage() {
  const read = useServerFn(getAdminCheckoutNotice);
  const save = useServerFn(saveCheckoutNotice);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CheckoutNoticeSettings | null>(null);
  const [validation, setValidation] = useState("");
  const query = useQuery({ queryKey: ["admin-checkout-notice"], queryFn: () => read(), retry: false });
  const mutation = useMutation({
    mutationFn: (data: CheckoutNoticeSettings) => save({ data }),
    onSuccess: (saved) => {
      setDraft(saved);
      qc.setQueryData(["admin-checkout-notice"], saved);
      qc.invalidateQueries({ queryKey: ["checkout-notice"] });
    },
  });
  const form = draft ?? query.data;
  function update(patch: Partial<CheckoutNoticeSettings>) {
    if (!form) return;
    setDraft({ ...form, ...patch });
    setValidation("");
    mutation.reset();
  }
  return (
    <main className="mx-auto max-w-3xl p-6">
      <AdminNav />
      <h1 className="font-display text-3xl text-gold mb-6">Checkout notice</h1>
      {query.isPending && <p role="status">Loading settings…</p>}
      {query.isError && <div role="alert" className="space-y-3 text-destructive">
        <p>{/Forbidden|Unauthorized/.test(query.error.message) ? "Sign in with an administrator account to edit checkout settings." : query.error.message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>Retry</Button>
      </div>}
      {form && !query.isError && (
        <form className="space-y-6" onSubmit={(event) => {
          event.preventDefault();
          const parsed = checkoutNoticeSchema.safeParse(form);
          if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Check your settings."); return; }
          mutation.mutate(parsed.data);
        }}>
          <fieldset disabled={mutation.isPending} className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4 gap-4">
              <label htmlFor="notice-enabled" className="text-sm">Pause new checkout</label>
              <Switch id="notice-enabled" checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="notice-message" className="text-sm">Customer message</label>
              <Textarea id="notice-message" value={form.message} maxLength={1000} rows={5} onChange={(e) => update({ message: e.target.value })} />
              <p className="text-xs text-muted-foreground">{form.message.length}/1,000</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="notice-scope" className="text-sm">Notice placement</label>
              <Select value={form.scope} onValueChange={(scope) => { if (scope === "site-wide" || scope === "report-checkout-only") update({ scope }); }}>
                <SelectTrigger id="notice-scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="report-checkout-only">Reports and checkout only</SelectItem>
                  <SelectItem value="site-wide">Site-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit"><Save />{mutation.isPending ? "Saving…" : "Save notice"}</Button>
          </fieldset>
          {(validation || mutation.isError) && <p role="alert" className="text-sm text-destructive">{validation || mutation.error?.message}</p>}
          {mutation.isSuccess && <p role="status" className="text-sm text-gold">Notice saved.</p>}
        </form>
      )}
    </main>
  );
}