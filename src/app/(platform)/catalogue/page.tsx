import type { Metadata } from "next";
import { CataloguePage } from "@/features/catalogue/components/catalogue-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { filterNotSoftDeleted } from "@/lib/soft-delete";
import { canDirectPush, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";
import { mapCatalogRows } from "@/server/catalogue/map-catalogue";

export const metadata: Metadata = { title: "Catalogue" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string; edit?: string; tab?: string }>;

export default async function CatalogueRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const isPlatform = isPlatformUser(session);
  const sites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  const svcCatRaw = filterNotSoftDeleted(
    (entities.service_categories ?? []) as Record<string, unknown>[],
  );
  const vehCatRaw = filterNotSoftDeleted(
    (entities.vehicle_categories ?? []) as Record<string, unknown>[],
  );
  const servicesRaw = filterNotSoftDeleted((entities.services ?? []) as Record<string, unknown>[]);
  const vtRaw = filterNotSoftDeleted((entities.vehicle_types ?? []) as Record<string, unknown>[]);
  const pricingRaw = filterNotSoftDeleted((entities.pricing ?? []) as Record<string, unknown>[]);

  const serviceCategoryOptions = svcCatRaw.map((c) => ({
    value: String(c.id),
    label: String(c.name ?? c.id),
  }));
  const vehicleCategoryOptions = vehCatRaw.map((c) => ({
    value: String(c.id),
    label: String(c.name ?? c.id),
  }));

  const serviceCategoriesMap = new Map(
    svcCatRaw.map((c) => [String(c.id), String(c.name ?? c.id)]),
  );
  const vehicleCategoriesMap = new Map(
    vehCatRaw.map((c) => [String(c.id), String(c.name ?? c.id)]),
  );
  const servicesMap = new Map(servicesRaw.map((s) => [String(s.id), String(s.name ?? s.id)]));
  const vtMap = new Map(vtRaw.map((v) => [String(v.id), String(v.name ?? v.id)]));
  const sitesMap = new Map(sites.map((s) => [s.id, s.nom]));

  const rowLabels = { sites: sitesMap };
  const serviceCategories = mapCatalogRows("service_categories", svcCatRaw, rowLabels);
  const vehicleCategories = mapCatalogRows("vehicle_categories", vehCatRaw, rowLabels);
  const services = mapCatalogRows("services", servicesRaw, {
    ...rowLabels,
    categories: serviceCategoriesMap,
  });
  const vehicleTypes = mapCatalogRows("vehicle_types", vtRaw, {
    ...rowLabels,
    categories: vehicleCategoriesMap,
  });
  const pricing = mapCatalogRows("pricing", pricingRaw, {
    ...rowLabels,
    services: servicesMap,
    vehicleTypes: vtMap,
  });

  return (
    <CataloguePage
      serviceCategories={serviceCategories}
      services={services}
      vehicleCategories={vehicleCategories}
      vehicleTypes={vehicleTypes}
      pricing={pricing}
      canEdit={canDirectPush(session)}
      siteId={siteId}
      siteLabel={siteLabel}
      isPlatform={isPlatform}
      sites={sites}
      serviceOptions={services.map((s) => ({ value: s.id, label: s.name }))}
      vehicleTypeOptions={vehicleTypes.map((v) => ({ value: v.id, label: v.name }))}
      serviceCategoryOptions={serviceCategoryOptions}
      vehicleCategoryOptions={vehicleCategoryOptions}
      editItemId={sp.edit?.trim() || null}
      initialTab={sp.tab?.trim() || null}
    />
  );
}