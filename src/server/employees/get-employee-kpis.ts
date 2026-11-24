import { parseVehicleCommissionRules } from "@/lib/employee-commission";
import { formatFcfa } from "@/lib/format";
import type { SessionPayload } from "@/server/auth/session";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";

const DONE = new Set(["delivered", "completed", "done"]);
const IN_PROGRESS = new Set(["washing", "assigned", "in_progress", "processing"]);

export type EmployeeKpiPack = {
  periodLabel: string;
  role: string;
  cards: { id: string; label: string; value: string; sub?: string }[];
  weeklySeries: { label: string; value: number }[];
  statusBreakdown: { label: string; value: number }[];
};

type OrderLite = {
  total: number;
  status: string;
  createdAt: Date;
  assignedId: string;
  createdById: string;
  siteId: string;
};

function parseOrder(raw: Record<string, unknown>): OrderLite | null {
  const createdRaw = raw.createdAt ?? raw.created_at;
  if (!createdRaw) return null;
  const createdAt = new Date(String(createdRaw));
  if (Number.isNaN(createdAt.getTime())) return null;
  return {
    total: Number(raw.total ?? raw.totalAmount ?? raw.amount ?? 0) || 0,
    status: String(raw.status ?? "pending").toLowerCase(),
    createdAt,
    assignedId: String(raw.assignedEmployeeId ?? raw.assigned_employee_id ?? ""),
    createdById: String(raw.createdByEmployeeId ?? raw.created_by_employee_id ?? ""),
    siteId: String(raw.lavSiteId ?? raw.lav_site_id ?? ""),
  };
}

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function weekIndexInMonth(date: Date, start: Date): number {
  const day = date.getDate();
  return Math.min(3, Math.floor((day - 1) / 7));
}

const WEEK_LABELS = ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4"];

export async function computeEmployeeKpis(
  session: SessionPayload,
  employee: Record<string, unknown>,
): Promise<EmployeeKpiPack> {
  const role = String(employee.role ?? "washer");
  const empId = String(employee.id);
  const siteId = String(employee.lavSiteId ?? employee.lav_site_id ?? "");
  const { entities } = await loadWorkspaceEntities(session);
  const orders = ((entities.orders ?? []) as Record<string, unknown>[])
    .map(parseOrder)
    .filter((o): o is OrderLite => o !== null);

  const start = monthStart();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  const inMonth = orders.filter((o) => o.createdAt >= start && o.createdAt <= end);

  const weekly = [0, 0, 0, 0];
  const statusMap = new Map<string, number>();

  function bumpWeek(o: OrderLite, metric: number) {
    const idx = weekIndexInMonth(o.createdAt, start);
    weekly[idx] = (weekly[idx] ?? 0) + metric;
  }

  function bumpStatus(status: string) {
    const key =
      DONE.has(status) ? "Terminées" : IN_PROGRESS.has(status) ? "En cours" : "Autres";
    statusMap.set(key, (statusMap.get(key) ?? 0) + 1);
  }

  let cards: EmployeeKpiPack["cards"] = [];

  if (role === "washer") {
    const mine = inMonth.filter((o) => o.assignedId === empId);
    for (const o of mine) {
      bumpWeek(o, 1);
      bumpStatus(o.status);
    }
    const completed = mine.filter((o) => DONE.has(o.status)).length;
    const active = mine.filter((o) => IN_PROGRESS.has(o.status)).length;
    const contract = String(employee.contractType ?? employee.contract_type ?? "perVehicle");
    const rules = parseVehicleCommissionRules(
      employee.ratePerVehicleType ?? employee.rate_per_vehicle_type,
    );
    const fixedValues = Object.values(rules)
      .filter((r) => r.mode === "fixed")
      .map((r) => r.value);
    const avgRate =
      fixedValues.length > 0
        ? fixedValues.reduce((a, b) => a + b, 0) / fixedValues.length
        : 0;
  const hasPercent = Object.values(rules).some((r) => r.mode === "percent");
    const commission =
      contract === "perVehicle" && (avgRate > 0 || hasPercent)
        ? hasPercent && avgRate === 0
          ? "% commande"
          : formatFcfa(completed * avgRate)
        : "—";

    cards = [
      { id: "assigned", label: "Prestations (mois)", value: String(mine.length) },
      { id: "done", label: "Véhicules terminés", value: String(completed) },
      { id: "active", label: "En cours", value: String(active) },
      {
        id: "commission",
        label: "Commissions estimées",
        value: commission,
        sub: contract === "perVehicle" ? "Contrat par véhicule" : "Contrat mensuel",
      },
    ];
  } else if (role === "cashier") {
    const mine = inMonth.filter((o) => o.createdById === empId);
    const revenue = mine.reduce((s, o) => s + o.total, 0);
    for (const o of mine) {
      bumpWeek(o, o.total);
      bumpStatus(o.status);
    }
    cards = [
      { id: "orders", label: "Commandes encaissées", value: String(mine.length) },
      { id: "revenue", label: "CA généré", value: formatFcfa(revenue) },
      {
        id: "avg",
        label: "Panier moyen",
        value: mine.length ? formatFcfa(Math.round(revenue / mine.length)) : "—",
      },
    ];
  } else {
    const siteOrders = inMonth.filter((o) => !siteId || o.siteId === siteId);
    const revenue = siteOrders.reduce((s, o) => s + o.total, 0);
    const team = ((entities.employees ?? []) as Record<string, unknown>[]).filter(
      (e) =>
        e.isActive !== false &&
        (!siteId || String(e.lavSiteId ?? e.lav_site_id ?? "") === siteId),
    );
    for (const o of siteOrders) {
      bumpWeek(o, 1);
      bumpStatus(o.status);
    }
    cards = [
      { id: "site-orders", label: "Commandes site (mois)", value: String(siteOrders.length) },
      { id: "site-ca", label: "CA site", value: formatFcfa(revenue) },
      { id: "team", label: "Équipe active", value: String(team.length) },
      {
        id: "role",
        label: "Périmètre",
        value: role === "admin" ? "Administration" : "Gestion",
      },
    ];
  }

  const periodLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return {
    periodLabel,
    role,
    cards,
    weeklySeries: WEEK_LABELS.map((label, i) => ({ label, value: weekly[i] ?? 0 })),
    statusBreakdown: Array.from(statusMap.entries()).map(([label, value]) => ({ label, value })),
  };
}