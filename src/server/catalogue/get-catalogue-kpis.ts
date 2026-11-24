import { formatFcfa } from "@/lib/format";
import { parseOrderServiceIds } from "@/lib/parse-order-service-ids";
import type { EntityKey } from "@/server/cloud/entity-sync";
import type { CloudEntities } from "@/server/cloud/entity-sync";

const COUNTED = new Set(["delivered", "completed", "done"]);
const CANCELLED = new Set(["cancelled", "canceled"]);

export type CatalogKpiPack = {
  periodLabel: string;
  cards: { id: string; label: string; value: string; sub?: string }[];
  weeklySeries: { label: string; value: number }[];
  statusBreakdown: { label: string; value: number }[];
};

type OrderLite = {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  vehicleTypeId: string;
  serviceIds: string[];
};

const WEEK_LABELS = ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4"];

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function weekIndexInMonth(date: Date): number {
  return Math.min(3, Math.floor((date.getDate() - 1) / 7));
}

function parseOrder(raw: Record<string, unknown>): OrderLite | null {
  const createdRaw = raw.createdAt ?? raw.created_at;
  if (!createdRaw) return null;
  const createdAt = new Date(String(createdRaw));
  if (Number.isNaN(createdAt.getTime())) return null;
  const serviceIds = parseOrderServiceIds(raw.serviceIds ?? raw.service_ids);
  const total = Number(raw.totalAmount ?? raw.total ?? raw.amount ?? 0) || 0;
  return {
    id: String(raw.id),
    total,
    status: String(raw.status ?? "pending").toLowerCase(),
    createdAt,
    vehicleTypeId: String(raw.vehicleTypeId ?? raw.vehicle_type_id ?? ""),
    serviceIds,
  };
}

function buildKpiFromOrders(
  orders: OrderLite[],
  matches: (o: OrderLite) => boolean,
  splitServiceRevenue = false,
): CatalogKpiPack {
  function revenueFor(o: OrderLite): number {
    if (!matches(o) || CANCELLED.has(o.status) || !COUNTED.has(o.status)) return 0;
    if (splitServiceRevenue && o.serviceIds.length > 1) return o.total / o.serviceIds.length;
    return o.total;
  }
  const start = monthStart();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  const inMonth = orders.filter((o) => o.createdAt >= start && o.createdAt <= end);

  const weeklyRevenue = [0, 0, 0, 0];
  let caMonth = 0;
  let ordersMonth = 0;
  const statusMap = new Map<string, number>();

  for (const o of inMonth) {
    const rev = revenueFor(o);
    const idx = weekIndexInMonth(o.createdAt);
    if (rev > 0) {
      caMonth += rev;
      ordersMonth += 1;
      weeklyRevenue[idx] = (weeklyRevenue[idx] ?? 0) + rev;
    }
    const sk = COUNTED.has(o.status)
      ? "Facturées"
      : CANCELLED.has(o.status)
        ? "Annulées"
        : "En cours / autres";
    if (revenueFor(o) > 0 || (matches(o) && !CANCELLED.has(o.status))) {
      statusMap.set(sk, (statusMap.get(sk) ?? 0) + 1);
    }
  }

  const periodLabel = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return {
    periodLabel,
    cards: [
      { id: "ca", label: "CA (mois)", value: formatFcfa(caMonth) },
      {
        id: "orders",
        label: "Commandes liées",
        value: String(ordersMonth),
        sub: "Statut livré / terminé",
      },
      {
        id: "avg",
        label: "Panier moyen",
        value: ordersMonth ? formatFcfa(Math.round(caMonth / ordersMonth)) : "—",
      },
      {
        id: "all",
        label: "Commandes (toutes)",
        value: String(inMonth.filter((o) => matches(o) && !CANCELLED.has(o.status)).length),
      },
    ],
    weeklySeries: WEEK_LABELS.map((label, i) => ({
      label,
      value: Math.round(weeklyRevenue[i] ?? 0),
    })),
    statusBreakdown: [...statusMap.entries()].map(([label, value]) => ({ label, value })),
  };
}

export function computeCatalogKpis(
  entities: CloudEntities,
  entityType: EntityKey,
  entityId: string,
  raw: Record<string, unknown>,
): CatalogKpiPack {
  const orders = ((entities.orders ?? []) as Record<string, unknown>[])
    .map(parseOrder)
    .filter((o): o is OrderLite => o !== null);

  if (entityType === "services") {
    return buildKpiFromOrders(orders, (o) => o.serviceIds.includes(entityId), true);
  }

  if (entityType === "vehicle_types") {
    return buildKpiFromOrders(orders, (o) => o.vehicleTypeId === entityId);
  }

  if (entityType === "pricing") {
    const serviceId = String(raw.serviceId ?? raw.service_id ?? "");
    const vehicleTypeId = String(raw.vehicleTypeId ?? raw.vehicle_type_id ?? "");
    return buildKpiFromOrders(
      orders,
      (o) => o.vehicleTypeId === vehicleTypeId && o.serviceIds.includes(serviceId),
      true,
    );
  }

  if (entityType === "vehicle_categories") {
    const typeIds = new Set(
      ((entities.vehicle_types ?? []) as Record<string, unknown>[])
        .filter((v) => String(v.categoryId ?? v.category_id ?? "") === entityId)
        .map((v) => String(v.id)),
    );
    return buildKpiFromOrders(orders, (o) => typeIds.has(o.vehicleTypeId));
  }

  if (entityType === "service_categories") {
    const serviceIds = new Set(
      ((entities.services ?? []) as Record<string, unknown>[])
        .filter((s) => String(s.type ?? s.categoryId ?? "") === entityId)
        .map((s) => String(s.id)),
    );
    return buildKpiFromOrders(
      orders,
      (o) => o.serviceIds.some((id) => serviceIds.has(id)),
      true,
    );
  }

  return buildKpiFromOrders(orders, () => false);
}