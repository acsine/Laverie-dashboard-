import { Eye } from "lucide-react";
import { Badge, KpiCard } from "@/components/ui";
import { CATALOG_KINDS, type CatalogKind } from "@/lib/catalogue-routes";
import type { CatalogKpiPack } from "@/server/catalogue/get-catalogue-kpis";
import type { CatalogRow } from "@/server/catalogue/map-catalogue";
import {
  MiniBarChart,
  StatusDonut,
} from "@/features/employees/components/employee-kpi-charts";

type Props = {
  item: CatalogRow;
  kind: CatalogKind;
  kpis: CatalogKpiPack;
  siteLabel?: string | null;
  serviceLabel?: string | null;
  vehicleTypeLabel?: string | null;
  categoryLabel?: string | null;
};

export function CatalogueDetailContent({
  item,
  kind,
  kpis,
  siteLabel,
  serviceLabel,
  vehicleTypeLabel,
  categoryLabel,
}: Props) {
  const typeLabel = CATALOG_KINDS[kind].label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-ink">{item.name}</h2>
        <Badge tone={item.isActive ? "success" : "neutral"}>
          {item.isActive ? "Actif" : "Inactif"}
        </Badge>
        <Badge tone="neutral">{typeLabel}</Badge>
      </div>

      <dl className="grid gap-2 rounded-panel border border-line bg-primary-softer/30 p-3 text-sm sm:grid-cols-2">
        <DetailField label="Identifiant" value={item.id} />
        {siteLabel && <DetailField label="Site" value={siteLabel} />}
        {item.description && <DetailField label="Description" value={item.description} />}
        {categoryLabel && <DetailField label="Catégorie" value={categoryLabel} />}
        {serviceLabel && <DetailField label="Service" value={serviceLabel} />}
        {vehicleTypeLabel && <DetailField label="Type véhicule" value={vehicleTypeLabel} />}
        {item.price != null && (
          <DetailField label="Prix catalogue" value={`${item.price.toLocaleString("fr-FR")} FCFA`} />
        )}
      </dl>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-ink">KPI — {kpis.periodLabel}</h2>
        </div>
        <p className="text-xs text-muted">
          Chiffre d&apos;affaires estimé à partir des commandes livrées / terminées du mois.
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {kpis.cards.map((c) => (
            <div key={c.id}>
              <KpiCard label={c.label} value={c.value} />
              {c.sub && <p className="mt-1 px-1 text-[11px] text-muted">{c.sub}</p>}
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border border-line p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              CA (4 semaines)
            </p>
            <MiniBarChart items={kpis.weeklySeries} valueSuffix=" F" />
          </div>
          <div className="rounded-panel border border-line p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Statut des commandes
            </p>
            <StatusDonut items={kpis.statusBreakdown} />
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}