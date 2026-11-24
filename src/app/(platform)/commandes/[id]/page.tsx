import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPage } from "@/features/orders/components/order-detail-page";
import { canDirectPush, requireSession } from "@/server/auth/guards";
import { entityBelongsToSessionSite } from "@/server/auth/site-scope";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import { buildOrderDetail, listWashers } from "@/server/orders/get-order-detail";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Commande ${id}` };
}

export default async function OrderDetailRoute({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();
  const { entities } = await loadWorkspaceEntities(session);
  const order = ((entities.orders ?? []) as Record<string, unknown>[]).find((o) => String(o.id) === id);
  if (!order) notFound();
  const orderSite = (order.lavSiteId ?? order.lav_site_id) as string | null | undefined;
  if (!entityBelongsToSessionSite(session, orderSite)) notFound();

  const detail = buildOrderDetail(entities, order);
  const washers = listWashers(entities);

  return <OrderDetailPage order={detail} canEdit={canDirectPush(session)} washers={washers} />;
}