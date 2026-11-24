export type OrderStatusCanonical =
  | "waiting"
  | "assigned"
  | "inProgress"
  | "completed"
  | "delivered"
  | "cancelled";

const LEGACY: Record<string, OrderStatusCanonical> = {
  pending: "waiting",
  washing: "inProgress",
};

export function normalizeOrderStatus(raw: string): OrderStatusCanonical {
  const s = raw.trim();
  if (s in LEGACY) return LEGACY[s] as OrderStatusCanonical;
  if (
    s === "waiting" ||
    s === "assigned" ||
    s === "inProgress" ||
    s === "completed" ||
    s === "delivered" ||
    s === "cancelled"
  ) {
    return s;
  }
  return "waiting";
}

export function orderStatusLabel(status: string): string {
  const c = normalizeOrderStatus(status);
  const labels: Record<OrderStatusCanonical, string> = {
    waiting: "En attente",
    assigned: "Assignée",
    inProgress: "En cours",
    completed: "Terminée",
    delivered: "Livrée",
    cancelled: "Annulée",
  };
  return labels[c];
}

export type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger";

export function orderStatusTone(status: string): StatusTone {
  const c = normalizeOrderStatus(status);
  if (c === "delivered") return "success";
  if (c === "completed") return "primary";
  if (c === "inProgress") return "primary";
  if (c === "assigned" || c === "waiting") return "warning";
  if (c === "cancelled") return "danger";
  return "neutral";
}

/** Prochaine étape métier (comme le mobile). */
export function nextOrderStatus(status: string): OrderStatusCanonical | null {
  const c = normalizeOrderStatus(status);
  if (c === "waiting") return "assigned";
  if (c === "assigned") return "inProgress";
  if (c === "inProgress") return "completed";
  if (c === "completed") return "delivered";
  return null;
}

export function nextOrderActionLabel(status: string): string | null {
  const c = normalizeOrderStatus(status);
  if (c === "waiting") return "Marquer comme assignée";
  if (c === "assigned") return "Démarrer le lavage";
  if (c === "inProgress") return "Marquer terminée";
  if (c === "completed") return "Marquer livrée";
  return null;
}

export type OrderListFilter =
  | "all"
  | "waiting"
  | "inProgress"
  | "completed"
  | "delivered"
  | "cancelled";

export function orderMatchesStatusFilter(status: string, filter: OrderListFilter): boolean {
  if (filter === "all") return true;
  const c = normalizeOrderStatus(status);
  if (filter === "waiting") return c === "waiting" || c === "assigned";
  if (filter === "inProgress") return c === "inProgress";
  if (filter === "completed") return c === "completed";
  if (filter === "delivered") return c === "delivered";
  if (filter === "cancelled") return c === "cancelled";
  return true;
}

export const ORDER_LIST_FILTERS: { id: OrderListFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "waiting", label: "En attente" },
  { id: "inProgress", label: "En cours" },
  { id: "completed", label: "Terminées" },
  { id: "delivered", label: "Livrées" },
  { id: "cancelled", label: "Annulées" },
];