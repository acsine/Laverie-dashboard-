import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuditPage } from "@/features/audit/components/audit-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites } from "@/server/entities/load-entities";
import { loadAuditLog } from "@/server/audit/get-audit";

export const metadata: Metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string }>;

export default async function AuditRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!isPlatformUser(session)) redirect("/");

  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const siteId = siteFilter;
  const siteLabel = await loadSiteLabel(siteId);
  const sites = (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }));
  const { rows, loadError } = await loadAuditLog(session, siteFilter);

  return (
    <AuditPage
      rows={rows}
      loadError={loadError}
      siteId={siteId}
      siteLabel={siteLabel}
      isPlatform
      sites={sites}
    />
  );
}