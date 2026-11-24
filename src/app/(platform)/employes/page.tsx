import type { Metadata } from "next";
import { EmployeesPage } from "@/features/employees/components/employees-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { canDirectPush, isPlatformUser, isSuperAdmin, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";
import { filterNotSoftDeleted } from "@/lib/soft-delete";
import { parseDefaultCommissionPercent } from "@/lib/employee-commission";
import { pullCloudSnapshot } from "@/server/cloud/entity-sync";
import { mapEmployeeRow } from "@/server/employees/map-employee-row";

export const metadata: Metadata = { title: "Employés" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string; edit?: string }>;

export default async function EmployesRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const raw = filterNotSoftDeleted((entities.employees ?? []) as Record<string, unknown>[]);
  const rows = raw.map((e) => mapEmployeeRow(e));
  const editEmployeeId = sp.edit?.trim() || null;

  const vehicleTypes = ((entities.vehicle_types ?? []) as Record<string, unknown>[]).map((v) => ({
    id: String(v.id),
    name: String(v.name ?? v.id),
  }));
  const sites = await loadSites(session);
  const siteOptions = sites.map((s) => ({ value: s.id, label: s.nom }));
  const sitePicker = sites.map((s) => ({ id: s.id, nom: s.nom }));
  const sitePaysById = Object.fromEntries(sites.map((s) => [s.id, s.pays]));

  let defaultCommissionPercent: number | null = null;
  try {
    const snap = await pullCloudSnapshot();
    defaultCommissionPercent = parseDefaultCommissionPercent(snap.appConfig);
  } catch {
    defaultCommissionPercent = null;
  }

  return (
    <EmployeesPage
      rows={rows}
      canEdit={canDirectPush(session)}
      isPlatform={isPlatformUser(session) || isSuperAdmin(session)}
      siteId={siteId}
      siteLabel={siteLabel}
      siteOptions={siteOptions}
      editEmployeeId={editEmployeeId}
      vehicleTypes={vehicleTypes}
      sites={sitePicker}
      defaultCommissionPercent={defaultCommissionPercent}
      sitePaysById={sitePaysById}
    />
  );
}