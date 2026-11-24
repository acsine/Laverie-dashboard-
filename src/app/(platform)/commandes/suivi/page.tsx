import type { Metadata } from "next";
import { OrderTrackingPage } from "@/features/orders/components/order-tracking-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";
import { mapOrdersListRows } from "@/server/orders/map-orders-list";

export const metadata: Metadata = { title: "Suivi commandes" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string }>;

export default async function OrderTrackingRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const rows = mapOrdersListRows(entities);
  const isPlatform = isPlatformUser(session);
  const sites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  return (
    <OrderTrackingPage
      rows={rows}
      siteLabel={siteLabel}
      siteId={siteId}
      isPlatform={isPlatform}
      sites={sites}
    />
  );
}