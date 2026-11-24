import { formatFcfa } from "@/lib/format";
import type { CloudEntities } from "@/server/cloud/entity-sync";

export type CustomerActivity = {
  ordersCount: number;
  totalSpent: number;
  totalSpentLabel: string;
};

export function getCustomerActivity(
  entities: CloudEntities,
  customerId: string,
): CustomerActivity {
  const orders = ((entities.orders ?? []) as Record<string, unknown>[]).filter(
    (o) => String(o.customerId ?? o.customer_id ?? "") === customerId,
  );
  const total = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount ?? o.total_amount ?? o.total ?? 0),
    0,
  );
  return {
    ordersCount: orders.length,
    totalSpent: total,
    totalSpentLabel: formatFcfa(total),
  };
}