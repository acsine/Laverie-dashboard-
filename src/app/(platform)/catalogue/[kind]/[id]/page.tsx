import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueDetailPage } from "@/features/catalogue/components/catalogue-detail-page";
import {
  CATALOG_KINDS,
  catalogDetailHref,
  isCatalogKind,
  type CatalogKind,
} from "@/lib/catalogue-routes";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { canDirectPush, requireSession } from "@/server/auth/guards";
import { computeCatalogKpis } from "@/server/catalogue/get-catalogue-kpis";
import { loadCatalogItem } from "@/server/catalogue/load-catalog-item";
import { mapCatalogRows } from "@/server/catalogue/map-catalogue";

type Props = {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ site?: string; edit?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind, id } = await params;
  return { title: `Catalogue ${kind} ${id}` };
}

export default async function CatalogueDetailRoute({ params, searchParams }: Props) {
  const { kind: kindParam, id } = await params;
  if (!isCatalogKind(kindParam)) notFound();
  const kind = kindParam as CatalogKind;

  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const session = await requireSession();
  const { raw, entityKey, entities, siteId } = await loadCatalogItem(session, kind, id, siteFilter);
  if (!raw) notFound();

  const serviceCategories = new Map(
    ((entities.service_categories ?? []) as Record<string, unknown>[]).map((c) => [
      String(c.id),
      String(c.name ?? c.id),
    ]),
  );
  const vehicleCategories = new Map(
    ((entities.vehicle_categories ?? []) as Record<string, unknown>[]).map((c) => [
      String(c.id),
      String(c.name ?? c.id),
    ]),
  );
  const services = new Map(
    ((entities.services ?? []) as Record<string, unknown>[]).map((s) => [
      String(s.id),
      String(s.name ?? s.id),
    ]),
  );
  const vehicleTypes = new Map(
    ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => [
      String(v.id),
      String(v.name ?? v.id),
    ]),
  );

  const labelMaps =
    entityKey === "vehicle_types"
      ? { categories: vehicleCategories }
      : entityKey === "services"
        ? { categories: serviceCategories }
        : entityKey === "pricing"
          ? { services, vehicleTypes }
          : undefined;

  const [item] = mapCatalogRows(entityKey, [raw], labelMaps);
  if (!item) notFound();

  const kpis = computeCatalogKpis(entities, entityKey, id, raw);
  const siteLabel = await loadSiteLabel(siteId);

  const listHref = siteFilter ? `/catalogue?site=${encodeURIComponent(siteFilter)}` : "/catalogue";
  const editHref = `${listHref}${listHref.includes("?") ? "&" : "?"}edit=${encodeURIComponent(id)}&tab=${encodeURIComponent(CATALOG_KINDS[kind].tabId)}`;

  let categoryLabel: string | null = null;
  let serviceLabel: string | null = null;
  let vehicleTypeLabel: string | null = null;
  if (item.serviceCategoryId) categoryLabel = serviceCategories.get(item.serviceCategoryId) ?? null;
  if (item.categoryId) categoryLabel = vehicleCategories.get(item.categoryId) ?? null;
  if (item.serviceId) serviceLabel = services.get(item.serviceId) ?? null;
  if (item.vehicleTypeId) vehicleTypeLabel = vehicleTypes.get(item.vehicleTypeId) ?? null;

  return (
    <CatalogueDetailPage
      item={item}
      kind={kind}
      kpis={kpis}
      listHref={listHref}
      editHref={editHref}
      canEdit={canDirectPush(session)}
      siteLabel={siteLabel}
      serviceLabel={serviceLabel}
      vehicleTypeLabel={vehicleTypeLabel}
      categoryLabel={categoryLabel}
    />
  );
}