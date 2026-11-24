import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDetailPage } from "@/features/clients/components/client-detail-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { getCustomerActivity } from "@/server/clients/get-customer-stats";
import { mapCustomerRow } from "@/server/clients/map-customer";
import { canDirectPush, requireSession } from "@/server/auth/guards";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ site?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Client ${id}` };
}

export default async function ClientDetailRoute({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const session = await requireSession();
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);

  const raw = ((entities.customers ?? []) as Record<string, unknown>[]).find(
    (c) => String(c.id) === id,
  );
  if (!raw) notFound();

  const customer = mapCustomerRow(raw);
  const vtMap = new Map(
    ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => [
      String(v.id),
      String(v.name ?? v.id),
    ]),
  );

  const vehicles = ((entities.vehicles ?? []) as Record<string, unknown>[])
    .filter((v) => String(v.customerId ?? v.customer_id ?? "") === id)
    .map((v) => {
      const typeId = String(v.vehicleTypeId ?? v.vehicle_type_id ?? "");
      return {
        id: String(v.id),
        matricule: String(v.matricule ?? ""),
        marque: String(v.marque ?? ""),
        vehicleTypeId: typeId,
        vehicleTypeName: vtMap.get(typeId) ?? typeId,
      };
    });

  const vehicleTypeOptions = ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map(
    (v) => ({
      value: String(v.id),
      label: String(v.name ?? v.id),
    }),
  );

  const activity = getCustomerActivity(entities, id);
  const listHref = siteFilter
    ? `/clients?site=${encodeURIComponent(siteFilter)}`
    : "/clients";

  return (
    <ClientDetailPage
      customer={customer}
      vehicles={vehicles}
      activity={activity}
      canEdit={canDirectPush(session)}
      listHref={listHref}
      siteId={siteId ?? customer.lavSiteId}
      vehicleTypeOptions={vehicleTypeOptions}
    />
  );
}