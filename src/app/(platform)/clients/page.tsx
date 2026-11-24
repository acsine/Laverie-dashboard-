import type { Metadata } from "next";
import { ClientsPage } from "@/features/clients/components/clients-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { customerDisplayName, mapCustomerRow } from "@/server/clients/map-customer";
import { canDirectPush, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string; edit?: string }>;

export default async function ClientsRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const isPlatform = isPlatformUser(session);
  const sites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  const vehicleTypes = ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => ({
    value: String(v.id),
    label: String(v.name ?? v.id),
  }));

  const vtMap = new Map(
    ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => [
      String(v.id),
      String(v.name ?? v.id),
    ]),
  );

  const vehicles = (entities.vehicles ?? []) as Record<string, unknown>[];
  const countByCustomer = new Map<string, number>();
  const vehiclesByCustomer: Record<
    string,
    {
      id: string;
      marque: string;
      matricule: string;
      vehicleTypeId: string;
      vehicleTypeName: string;
    }[]
  > = {};

  for (const v of vehicles) {
    const cid = String(v.customerId ?? v.customer_id ?? "");
    if (!cid) continue;
    countByCustomer.set(cid, (countByCustomer.get(cid) ?? 0) + 1);
    const typeId = String(v.vehicleTypeId ?? v.vehicle_type_id ?? "");
    const list = vehiclesByCustomer[cid] ?? [];
    list.push({
      id: String(v.id),
      marque: String(v.marque ?? ""),
      matricule: String(v.matricule ?? ""),
      vehicleTypeId: typeId,
      vehicleTypeName: vtMap.get(typeId) ?? typeId,
    });
    vehiclesByCustomer[cid] = list;
  }

  const rows = ((entities.customers ?? []) as Record<string, unknown>[]).map((c) => {
    const dto = mapCustomerRow(c);
    return {
      ...dto,
      name: customerDisplayName(dto),
      vehicleCount: countByCustomer.get(dto.id) ?? 0,
    };
  });

  const editCustomerId = sp.edit?.trim() || null;

  return (
    <ClientsPage
      rows={rows}
      canEdit={canDirectPush(session)}
      siteLabel={siteLabel}
      siteId={siteId}
      isPlatform={isPlatform}
      sites={sites}
      vehicleTypeOptions={vehicleTypes}
      vehiclesByCustomerId={vehiclesByCustomer}
      editCustomerId={editCustomerId}
    />
  );
}