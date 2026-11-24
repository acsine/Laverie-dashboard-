import { formatFcfa } from "@/lib/format";
import { normalizeOrderStatus } from "@/lib/order-status";
import { parseOrderServiceIds } from "@/lib/parse-order-service-ids";
import { buildServiceNameMap, resolveServiceName } from "@/lib/resolve-service-name";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import type { CloudEntities } from "@/server/cloud/entity-sync";

export function buildOrderDetail(entities: CloudEntities, order: Record<string, unknown>) {
  const customers = new Map(
    ((entities.customers ?? []) as Record<string, unknown>[]).map((c) => [String(c.id), c]),
  );
  const services = buildServiceNameMap(entities);
  const vehicleTypes = new Map(
    ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => [String(v.id), String(v.name ?? v.id)]),
  );
  const vehicles = new Map(
    ((entities.vehicles ?? []) as Record<string, unknown>[]).map((v) => [String(v.id), String(v.matricule ?? "")]),
  );
  const employees = new Map(
    ((entities.employees ?? []) as Record<string, unknown>[]).map((e) => [
      String(e.id),
      `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim(),
    ]),
  );

  const customerRaw = customers.get(String(order.customerId ?? ""));
  const customerName = customerRaw
    ? customerDisplayName(mapCustomerRow(customerRaw))
    : String(order.customerId ?? "—");
  const customerPhone = customerRaw ? String(customerRaw.phone ?? "") : "";

  const typeName = vehicleTypes.get(String(order.vehicleTypeId ?? "")) ?? "—";
  const vehicleId = order.vehicleId ? String(order.vehicleId) : "";
  const plate = vehicleId ? vehicles.get(vehicleId) || vehicleId : "";
  const vehicleLabel = plate ? `${typeName} · ${plate}` : typeName;

  const serviceIds = parseOrderServiceIds(order.serviceIds ?? order.service_ids);

  const serviceLabels = serviceIds.map((id) => resolveServiceName(services, id)).join(" · ");

  const discount = Number(order.discount ?? 0);
  const total = Number(order.totalAmount ?? 0);
  const finalAmount = Math.max(0, total - discount);
  const createdAt = order.createdAt ? String(order.createdAt) : null;

  const serviceItems = serviceIds.map((id) => ({
    name: resolveServiceName(services, id),
    price: serviceIds.length > 0 ? total / serviceIds.length : 0,
  }));

  const assignedId = order.assignedEmployeeId ? String(order.assignedEmployeeId) : null;
  const washerName = assignedId ? employees.get(assignedId) ?? null : null;

  return {
    id: String(order.id),
    status: normalizeOrderStatus(String(order.status ?? "waiting")),
    customerName,
    customerPhone,
    vehicleLabel,
    vehiclePlate: plate || "—",
    vehicleTypeName: typeName,
    serviceLabels,
    serviceItems,
    subtotal: total,
    discountAmount: discount,
    finalAmount,
    createdAt,
    totalLabel: formatFcfa(finalAmount),
    discountLabel: discount > 0 ? formatFcfa(discount) : "—",
    paymentMethod: String(order.paymentMethod ?? "cash"),
    notes: String(order.notes ?? ""),
    invoiceNumber: order.invoiceNumber ? String(order.invoiceNumber) : null,
    pickupCode: order.pickupCode ? String(order.pickupCode) : null,
    assignedEmployeeId: assignedId,
    washerName,
    lavSiteId: order.lavSiteId ? String(order.lavSiteId) : null,
  };
}

export function listWashers(entities: CloudEntities) {
  return ((entities.employees ?? []) as Record<string, unknown>[])
    .filter((e) => {
      const role = String(e.role ?? "").toLowerCase();
      return role === "washer" || role === "laveur";
    })
    .filter((e) => e.isActive !== false && e.is_active !== false)
    .map((e) => ({
      value: String(e.id),
      label: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || String(e.id),
    }));
}