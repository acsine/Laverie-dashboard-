import type { CatalogKind } from "@/lib/catalogue-routes";
import { parseOrderServiceIds } from "@/lib/parse-order-service-ids";
import type { CloudEntities } from "@/server/cloud/entity-sync";

export function catalogDeleteConfirmDescription(kind: CatalogKind, name: string): string {
  const base = `Supprimer définitivement « ${name} » ?`;
  switch (kind) {
    case "service-categories":
      return `${base}\n\nLes services et tarifs associés seront supprimés s’ils ne sont liés à aucune commande.`;
    case "vehicle-categories":
      return `${base}\n\nLes types de véhicule et tarifs associés seront supprimés s’ils ne sont liés à aucune commande.`;
    case "services":
      return `${base}\n\nLes tarifs de ce service seront aussi supprimés. Impossible si une commande utilise ce service.`;
    case "vehicle-types":
      return `${base}\n\nLes tarifs pour ce type seront aussi supprimés. Impossible si une commande utilise ce type.`;
    case "pricing":
      return base;
    default:
      return base;
  }
}

type OrderRow = Record<string, unknown>;

function activeOrders(entities: CloudEntities): OrderRow[] {
  return ((entities.orders ?? []) as OrderRow[]).filter((o) => !o.deletedAt && !o.deleted_at);
}

export function ordersUseService(entities: CloudEntities, serviceId: string): boolean {
  return activeOrders(entities).some((o) =>
    parseOrderServiceIds(o.serviceIds ?? o.service_ids).includes(serviceId),
  );
}

export function ordersUseVehicleType(entities: CloudEntities, vehicleTypeId: string): boolean {
  return activeOrders(entities).some(
    (o) => String(o.vehicleTypeId ?? o.vehicle_type_id ?? "") === vehicleTypeId,
  );
}

export function ordersUseEmployee(entities: CloudEntities, employeeId: string): boolean {
  return activeOrders(entities).some(
    (o) => String(o.assignedEmployeeId ?? o.assigned_employee_id ?? "") === employeeId,
  );
}

export function ordersUseClientVehicle(entities: CloudEntities, vehicleId: string): boolean {
  return activeOrders(entities).some((o) => String(o.vehicleId ?? o.vehicle_id ?? "") === vehicleId);
}

export function serviceIdsInCategory(entities: CloudEntities, categoryId: string): string[] {
  return ((entities.services ?? []) as Record<string, unknown>[])
    .filter((s) => String(s.type ?? "") === categoryId)
    .map((s) => String(s.id));
}

export function vehicleTypeIdsInCategory(entities: CloudEntities, categoryId: string): string[] {
  return ((entities.vehicle_types ?? []) as Record<string, unknown>[])
    .filter((v) => String(v.categoryId ?? v.category_id ?? "") === categoryId)
    .map((v) => String(v.id));
}