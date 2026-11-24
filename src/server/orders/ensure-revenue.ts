import { newEntityId } from "@/lib/ids";
import type { CloudEntities } from "@/server/cloud/entity-sync";
import { upsertEntityCloud } from "@/server/cloud/entity-sync";

export async function ensureRevenueForOrder(
  entities: CloudEntities,
  order: Record<string, unknown>,
): Promise<void> {
  const orderId = String(order.id);
  const existing = ((entities.revenues ?? []) as Record<string, unknown>[]).some(
    (r) => String(r.orderId ?? r.order_id ?? "") === orderId,
  );
  if (existing) return;

  const total = Number(order.totalAmount ?? 0);
  const discount = Number(order.discount ?? 0);
  const amount = Math.max(0, total - discount);
  const now = new Date().toISOString();
  const id = newEntityId("rev");

  await upsertEntityCloud("revenues", {
    id,
    lavSiteId: String(order.lavSiteId ?? order.lav_site_id ?? ""),
    orderId,
    customerId: String(order.customerId ?? ""),
    amount,
    paymentMethod: String(order.paymentMethod ?? "cash"),
    date: now,
    description: `Commande ${order.invoiceNumber ?? orderId}`,
    notes: "",
    createdAt: now,
    updatedAt: now,
  });
}