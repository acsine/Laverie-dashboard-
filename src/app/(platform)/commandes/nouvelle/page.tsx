import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewOrderPage } from "@/features/orders/components/new-order-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { canDirectPush, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import { listWashers } from "@/server/orders/get-order-detail";

export const metadata: Metadata = { title: "Nouvelle commande" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string; customer?: string }>;

export default async function NewOrderRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!canDirectPush(session)) redirect("/commandes");

  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const isPlatform = isPlatformUser(session);
  const sites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  const vehiclesByCustomer = new Map<
    string,
    { value: string; label: string; vehicleTypeId: string }[]
  >();
  for (const v of (entities.vehicles ?? []) as Record<string, unknown>[]) {
    const cid = String(v.customerId ?? "");
    if (!cid) continue;
    const list = vehiclesByCustomer.get(cid) ?? [];
    list.push({
      value: String(v.id),
      label: `${v.matricule ?? v.id}${v.marque ? ` · ${v.marque}` : ""}`,
      vehicleTypeId: String(v.vehicleTypeId ?? v.vehicle_type_id ?? ""),
    });
    vehiclesByCustomer.set(cid, list);
  }

  const customers = ((entities.customers ?? []) as Record<string, unknown>[]).map((c) => {
    const row = mapCustomerRow(c);
    return {
      value: row.id,
      label: customerDisplayName(row),
      vehicles: vehiclesByCustomer.get(row.id) ?? [],
    };
  });

  const vehicleTypes = ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => ({
    value: String(v.id),
    label: String(v.name ?? v.id),
  }));
  const services = ((entities.services ?? []) as Record<string, unknown>[]).map((s) => ({
    value: String(s.id),
    label: String(s.name ?? s.id),
  }));
  const pricing = ((entities.pricing ?? []) as Record<string, unknown>[]).map((p) => ({
    serviceId: String(p.serviceId ?? p.service_id ?? ""),
    vehicleTypeId: String(p.vehicleTypeId ?? p.vehicle_type_id ?? ""),
    price: Number(p.price ?? 0),
    lavSiteId:
      p.lavSiteId != null && String(p.lavSiteId).trim()
        ? String(p.lavSiteId)
        : p.lav_site_id != null && String(p.lav_site_id).trim()
          ? String(p.lav_site_id)
          : null,
  }));
  const washers = listWashers(entities);

  return (
    <NewOrderPage
      customers={customers}
      vehicleTypes={vehicleTypes}
      services={services}
      pricing={pricing}
      washers={washers}
      siteLabel={siteLabel}
      siteId={siteId}
      isPlatform={isPlatform}
      sites={sites}
      defaultCustomerId={sp.customer?.trim() || null}
    />
  );
}