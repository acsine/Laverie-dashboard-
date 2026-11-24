import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SitesPage } from "@/features/sites/components/sites-page";
import { isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites } from "@/server/entities/load-entities";
import { loadSiteAdminCandidates } from "@/server/sites/load-site-admin-candidates";

export const metadata: Metadata = { title: "Sites" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ edit?: string }>;

export default async function SitesRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!isPlatformUser(session)) redirect("/");

  const sp = await searchParams;
  const [sites, adminCandidates] = await Promise.all([
    loadSites(session),
    loadSiteAdminCandidates(session),
  ]);
  return (
    <SitesPage
      rows={sites}
      adminCandidates={adminCandidates}
      editSiteId={sp.edit?.trim() || null}
    />
  );
}