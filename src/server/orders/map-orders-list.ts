import { formatFcfa, formatDateTime } from "@/lib/format";
import { orderStatusLabel, normalizeOrderStatus } from "@/lib/order-status";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import type { CloudEntities } from "@/server/cloud/entity-sync";

export type OrderListRow = {
  id: string;
  label: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel: string;
  status: string;
  statusLabel: string;
  totalLabel: string;
  paymentMethod: string;
  pickupCode: string | null;
  createdAt: string;
  lavSiteId: string | null;
};

function customerMap(entities: CloudEntities) {
  const map = new Map<string, Record<string, unknown>>();
  for (const c of (entities.customers ?? []) as Record<string, unknown>[]) {
    map.set(String(c.id), c);
  }
  return map;
}

function vehicleTypeMap(entities: CloudEntities) {
  const map = new Map<string, string>();
  for (const v of (entities.vehicle_types ?? []) as Record<string, unknown>[]) {
    map.set(String(v.id), String(v.name ?? v.id));
  }
  return map;
}

function vehiclePlateMap(entities: CloudEntities) {
  const map = new Map<string, string>();
  for (const v of (entities.vehicles ?? []) as Record<string, unknown>[]) {
    map.set(String(v.id), String(v.matricule ?? ""));
  }
  return map;
}

export function mapOrdersListRows(entities: CloudEntities): OrderListRow[] {
  const customers = customerMap(entities);
  const vehicleTypes = vehicleTypeMap(entities);
  const plates = vehiclePlateMap(entities);

  return ((entities.orders ?? []) as Record<string, unknown>[]).map((o) => {
    const id = String(o.id);
    const customer = customers.get(String(o.customerId ?? ""));
    const customerName = customer
      ? customerDisplayName(mapCustomerRow(customer))
      : String(o.customerId ?? "—");
    const customerPhone = customer ? String(customer.phone ?? "") : "";
    const typeName = vehicleTypes.get(String(o.vehicleTypeId ?? "")) ?? "—";
    const vehicleId = o.vehicleId ? String(o.vehicleId) : "";
    const plate = vehicleId ? plates.get(vehicleId) || vehicleId : "";
    const vehicleLabel = plate ? `${typeName} · ${plate}` : typeName;
    const status = normalizeOrderStatus(String(o.status ?? "waiting"));

    return {
      id,
      label: String(o.invoiceNumber ?? o.pickupCode ?? id),
      customerName,
      customerPhone,
      vehicleLabel,
      status,
      statusLabel: orderStatusLabel(status),
      totalLabel: formatFcfa(Number(o.totalAmount ?? 0) - Number(o.discount ?? 0)),
      paymentMethod: String(o.paymentMethod ?? "cash"),
      pickupCode: o.pickupCode ? String(o.pickupCode) : null,
      createdAt: o.createdAt ? formatDateTime(String(o.createdAt)) : "—",
      lavSiteId: o.lavSiteId ? String(o.lavSiteId) : null,
    };
  });
}