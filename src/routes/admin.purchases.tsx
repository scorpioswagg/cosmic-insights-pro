import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  grantReportAccess,
  listEntitlements,
  listPurchases,
  revokeReportAccess,
} from "@/lib/admin/purchases.functions";
import { formatPrice } from "@/lib/reports/pricing";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";

export const Route = createFileRoute("/admin/purchases")({
  ssr: false,
  component: PurchasesPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="mb-2 text-2xl font-semibold">Purchases</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {msg === "Forbidden" || msg.startsWith("Unauthorized")
            ? "You need admin access to view this page."
            : msg}
        </p>
        <div className="flex gap-3">
          <Link to="/"><Button variant="outline">Home</Button></Link>
          <Button onClick={() => { reset(); router.invalidate(); }}>Retry</Button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function PurchasesPage() {
  const fetchPurchases = useServerFn(listPurchases);
  const fetchEntitlements = useServerFn(listEntitlements);
  const runGrant = useServerFn(grantReportAccess);
  const runRevoke = useServerFn(revokeReportAccess);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [reportId, setReportId] = useState("");

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: () => fetchPurchases(),
  });
  const { data: entitlements } = useQuery({
    queryKey: ["admin-entitlements"],
    queryFn: () => fetchEntitlements(),
  });

  const grant = useMutation({
    mutationFn: () => runGrant({ data: { email: email.trim(), reportId: reportId.trim() } }),
    onSuccess: () => {
      toast.success("Access granted.");
      setEmail(""); setReportId("");
      qc.invalidateQueries({ queryKey: ["admin-entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (v: { userId: string; reportId: string }) => runRevoke({ data: v }),
    onSuccess: () => {
      toast.success("Access revoked.");
      qc.invalidateQueries({ queryKey: ["admin-entitlements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenue = (purchases ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Purchases &amp; access</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Every checkout, its payment status, and the confirmation email state.
      </p>
      <AdminNav />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Purchases" value={String(purchases?.length ?? 0)} />
        <Stat label="Paid revenue" value={formatPrice(revenue)} />
        <Stat label="Active entitlements" value={String((entitlements ?? []).filter((e) => e.status === "active").length)} />
      </div>

      <form
        className="mb-8 grid gap-2 rounded-md border p-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => { e.preventDefault(); grant.mutate(); }}
      >
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input
          required value={reportId} onChange={(e) => setReportId(e.target.value)}
          placeholder="report id (e.g. natal-essence)"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={grant.isPending}>
          {grant.isPending ? "Granting…" : "Grant free access"}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Report</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Email</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.customer_email ?? p.user_id.slice(0, 8)}</td>
                  <td className="p-3">{p.reportTitle}</td>
                  <td className="p-3">{formatPrice(p.amount_cents)}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 text-muted-foreground">{p.emailStatus}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(purchases ?? []).length === 0 && (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>No purchases yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 mt-8 text-lg font-semibold">Entitlements</h2>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Report</th>
              <th className="p-3">Source</th>
              <th className="p-3">Status</th>
              <th className="p-3">Granted</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(entitlements ?? []).map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-mono text-xs">{e.user_id.slice(0, 8)}…</td>
                <td className="p-3">{e.report_id}</td>
                <td className="p-3">{e.source}</td>
                <td className="p-3">{e.status}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(e.granted_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  {e.status === "active" && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => revoke.mutate({ userId: e.user_id, reportId: e.report_id })}
                    >
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {(entitlements ?? []).length === 0 && (
              <tr><td className="p-4 text-muted-foreground" colSpan={6}>No entitlements yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}