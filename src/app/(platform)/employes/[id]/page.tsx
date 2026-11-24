import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";
import type { EmployeeRow } from "@/features/employees/components/employees-page";
import { isSoftDeleted } from "@/lib/soft-delete";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { canDirectPush, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import { computeEmployeeKpis } from "@/server/employees/get-employee-kpis";
import { mapEmployeeRow } from "@/server/employees/map-employee-row";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ site?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Employé ${id}` };
}

export default async function EmployeDetailRoute({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const session = await requireSession();
  const { entities } = await loadWorkspaceEntities(session, siteFilter);

  const raw = ((entities.employees ?? []) as Record<string, unknown>[]).find(
    (e) => String(e.id) === id,
  );
  if (!raw || isSoftDeleted(raw)) notFound();

  const employee = mapEmployeeRow(raw) as EmployeeRow;
  const kpis = await computeEmployeeKpis(session, raw);
  const siteLabel = await loadSiteLabel(employee.lavSiteId);

  const listHref = siteFilter
    ? `/employes?site=${encodeURIComponent(siteFilter)}`
    : "/employes";

  return (
    <EmployeeDetailPage
      employee={employee}
      kpis={kpis}
      siteLabel={siteLabel}
      canEdit={canDirectPush(session)}
      isPlatform={isPlatformUser(session)}
      listHref={listHref}
    />
  );
}