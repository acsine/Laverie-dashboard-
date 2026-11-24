"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ShoppingCart,
  Users,
  UserRound,
  Wallet,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { SiteFilterBanner } from "@/components/site-filter-banner";
import { Badge, Breadcrumbs, DataTable, EmptyState, KpiCard, ListSearchInput } from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import type { PeriodKey, Vue360Data } from "@/server/dashboard/get-vue360";
import { cn } from "@/lib/utils";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Année" },
];

const statusTone = (status: string): "neutral" | "primary" | "success" | "warning" | "danger" => {
  if (status === "delivered" || status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "washing") return "primary";
  if (status === "pending") return "warning";
  return "neutral";
};

type Props = { data: Vue360Data };

export function Vue360View({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderSearch, setOrderSearch] = useState("");

  const filteredOrders = useMemo(
    () =>
      data.recentOrders.filter((r) =>
        matchesListSearch(orderSearch, [
          r.id,
          r.invoiceNumber,
          r.customerId,
          r.status,
          r.statusLabel,
          r.totalLabel,
          r.paymentMethod,
          r.createdAt,
        ]),
      ),
    [data.recentOrders, orderSearch],
  );

  const ordersEmpty = listSearchEmptyCopy(orderSearch, "Aucune commande");

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/?${params.toString()}`);
  }

  const orderColumns: Column<Vue360Data["recentOrders"][number]>[] = [
    {
      key: "id",
      header: "N° / id",
      render: (row) => (
        <span className="font-medium">{row.invoiceNumber || row.id}</span>
      ),
    },
    { key: "customer", header: "Client", render: (row) => row.customerId },
    { key: "amount", header: "Montant", render: (row) => row.totalLabel },
    { key: "pay", header: "Paiement", render: (row) => row.paymentMethod },
    {
      key: "status",
      header: "Statut",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>,
    },
    { key: "date", header: "Date", render: (row) => row.createdLabel },
  ];

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Vue 360" }]} />
          <h1 className="mt-1.5 text-[22px] font-bold text-ink lg:text-2xl">Vue 360</h1>
          <p className="mt-1 text-sm text-muted">
            Données live Supabase · source {data.source}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.isPlatform ? (
            <select
              aria-label="Filtrer par site"
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm"
              value={data.siteId ?? "all"}
              onChange={(e) => setFilter("site", e.target.value)}
            >
              <option value="all">Tous les sites</option>
              {data.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          ) : data.siteLabel ? (
            <SiteFilterBanner label={data.siteLabel} />
          ) : null}
          <div className="flex flex-wrap gap-1 rounded-control border border-line bg-surface p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilter("period", p.id)}
                className={cn(
                  "min-h-9 rounded-control px-3 text-xs font-medium",
                  data.period === p.id
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-primary-softer hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="banner-gradient rounded-panel px-4 py-3 text-white shadow-card">
        <p className="text-xs font-medium text-white/90 sm:text-sm">
          {data.isPlatform ? "Pilotage plateforme" : `Agence · ${data.siteLabel ?? "votre site"}`}
        </p>
        <p className="mt-0.5 text-base font-semibold sm:text-lg">
          {data.isPlatform
            ? `${data.kpis.sitesActifs} site(s) actif(s) · CA période ${data.kpis.caLabel}`
            : `CA période ${data.kpis.caLabel} · marge ${data.kpis.margeLabel}`}
        </p>
      </div>

      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1 md:grid md:gap-2.5 md:overflow-visible",
          data.isPlatform ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-2 lg:grid-cols-5",
        )}
      >
        {data.isPlatform && (
          <KpiCard
            className="min-w-[140px] flex-1"
            label="Sites actifs"
            value={`${data.kpis.sitesActifs}/${data.kpis.sitesTotal}`}
            icon={Building2}
          />
        )}
        <KpiCard
          className="min-w-[140px] flex-1"
          label="Commandes"
          value={String(data.kpis.commandes)}
          icon={ShoppingCart}
        />
        <KpiCard
          className="min-w-[140px] flex-1"
          label="Employés"
          value={String(data.kpis.employes)}
          icon={Users}
        />
        <KpiCard
          className="min-w-[140px] flex-1"
          label="Clients"
          value={String(data.kpis.clients)}
          icon={UserRound}
        />
        <KpiCard
          className="min-w-[140px] flex-1"
          label="CA période"
          value={data.kpis.caLabel}
          icon={Wallet}
        />
        <KpiCard
          className="min-w-[140px] flex-1"
          label="Marge"
          value={data.kpis.margeLabel}
          icon={TrendingUp}
          trend={{
            label: data.kpis.marge >= 0 ? "Positive" : "Négative",
            positive: data.kpis.marge >= 0,
          }}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="rounded-panel border border-line bg-surface p-4 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-ink">Modes de paiement (période)</h2>
          </div>
          {data.paymentBreakdown.length === 0 ? (
            <EmptyState title="Aucun revenu sur la période" />
          ) : (
            <ul className="space-y-3">
              {data.paymentBreakdown.map((p) => {
                const pct =
                  data.kpis.ca > 0 ? Math.round((p.amount / data.kpis.ca) * 100) : 0;
                return (
                  <li key={p.method}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink">{p.label}</span>
                      <span className="tabular-nums text-muted">
                        {p.amountLabel} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-primary-softer">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Alertes</h2>
          <ul className="space-y-3">
            {data.alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    a.tone === "danger" && "bg-danger",
                    a.tone === "warning" && "bg-warning",
                    a.tone === "info" && "bg-primary",
                  )}
                />
                <span className="text-ink">{a.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Cartes fidélité actives : {data.kpis.cartesFidelite}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-ink">Dernières commandes</h2>
        <ListSearchInput
          value={orderSearch}
          onChange={setOrderSearch}
          placeholder="N° commande, statut, montant, date…"
          id="vue360-orders-search"
          className="mb-3"
        />
        <DataTable
          columns={orderColumns}
          rows={filteredOrders}
          rowKey={(r) => r.id}
          emptyTitle={ordersEmpty.emptyTitle}
          emptyDescription={
            orderSearch.trim()
              ? ordersEmpty.emptyDescription
              : "Les commandes cloud apparaîtront ici."
          }
        />
      </div>
    </div>
  );
}
