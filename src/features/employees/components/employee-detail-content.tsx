import { Eye } from "lucide-react";
import { Badge, KpiCard } from "@/components/ui";
import type { EmployeeKpiPack } from "@/server/employees/get-employee-kpis";
import { contractLabel, roleLabel } from "./employee-labels";
import { MiniBarChart, StatusDonut } from "./employee-kpi-charts";
import type { EmployeeRow } from "./employees-page";

type Props = {
  employee: EmployeeRow;
  kpis: EmployeeKpiPack | null;
  siteLabel?: string | null;
  kpisLoading?: boolean;
};

export function EmployeeDetailContent({ employee, kpis, siteLabel, kpisLoading }: Props) {
  const weeklySuffix = employee.role === "cashier" ? " F" : "";

  return (
    <div className="space-y-4">
      <DetailHeader employee={employee} />

      <dl className="grid gap-2 rounded-panel border border-line bg-primary-softer/30 p-3 text-sm sm:grid-cols-2">
        <DetailField label="Identifiant" value={employee.id} />
        <DetailField
          label="Site"
          value={siteLabel ?? employee.lavSiteId ?? "—"}
        />
        <DetailField label="Téléphone" value={employee.phone || "—"} />
        <DetailField label="E-mail" value={employee.email || "—"} />
        <DetailField label="Contrat" value={contractLabel(employee.contractType)} />
        <DetailField
          label="Embauche"
          value={
            employee.hireDate
              ? new Date(employee.hireDate).toLocaleDateString("fr-FR")
              : "—"
          }
        />
        {employee.contractType === "monthly" && employee.monthlySalary != null && (
          <DetailField label="Salaire mensuel" value={`${employee.monthlySalary} FCFA`} />
        )}
      </dl>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-ink">
            KPI — {kpis?.periodLabel ?? (kpisLoading ? "chargement…" : "—")}
          </h2>
        </div>
        <p className="text-xs text-muted">
          Indicateurs adaptés au poste (
          {employee.role === "washer"
            ? "laveur : prestations assignées"
            : employee.role === "cashier"
              ? "caissier : commandes créées"
              : "gérant / admin : vue site"}
          ).
        </p>

        {kpisLoading && !kpis && <p className="text-sm text-muted">Calcul des indicateurs…</p>}

        {kpis && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {kpis.cards.map((c) => (
                <div key={c.id} className="relative">
                  <KpiCard label={c.label} value={c.value} />
                  {c.sub && <p className="mt-1 px-1 text-[11px] text-muted">{c.sub}</p>}
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-panel border border-line p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Évolution (4 semaines)
                </p>
                <MiniBarChart items={kpis.weeklySeries} valueSuffix={weeklySuffix} />
              </div>
              <div className="rounded-panel border border-line p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Répartition des statuts
                </p>
                <StatusDonut items={kpis.statusBreakdown} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DetailHeader({ employee }: { employee: EmployeeRow }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
        {employee.firstName.charAt(0) || "?"}
      </div>
      <div>
        <p className="text-lg font-semibold text-ink">
          {employee.firstName} {employee.lastName}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge tone="neutral">{roleLabel(employee.role)}</Badge>
          <Badge tone={employee.isActive ? "success" : "danger"}>
            {employee.isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}