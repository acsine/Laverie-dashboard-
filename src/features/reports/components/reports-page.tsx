"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SiteFilterBanner } from "@/components/site-filter-banner";
import { Breadcrumbs, KpiCard, Button } from "@/components/ui";
import type { PeriodKey, Vue360Data } from "@/server/dashboard/get-vue360";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Année" },
];

export function ReportsPage({
  data,
  siteLabel,
  isPlatform,
}: {
  data: Vue360Data;
  siteLabel?: string | null;
  isPlatform: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(period: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/rapports?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Rapports" }]} />
      <h1 className="text-2xl font-bold text-ink">Rapports</h1>
      {!isPlatform && siteLabel && <SiteFilterBanner label={siteLabel} />}
      <p className="text-sm text-muted">
        Période : {data.period} · Export PDF/Excel : utilisez l&apos;impression navigateur (phase finale).
      </p>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={data.period === p.id ? "primary" : "secondary"}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Commandes" value={String(data.kpis.commandes)} />
        <KpiCard label="Clients" value={String(data.kpis.clients)} />
        <KpiCard label="CA" value={data.kpis.caLabel} />
        <KpiCard label="Marge" value={data.kpis.margeLabel} />
      </div>
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        Imprimer le rapport
      </Button>
    </div>
  );
}