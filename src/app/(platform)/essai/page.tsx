import type { Metadata } from "next";
import { Suspense } from "react";
import { TrialPage } from "@/features/trial/components/trial-page";
import { Skeleton } from "@/components/ui";
import { canApproveTrialExtension, requireSession } from "@/server/auth/guards";
import { getTrialDashboard } from "@/server/trial/get-trial";
import { loadSites } from "@/server/entities/load-entities";

export const metadata: Metadata = { title: "Essai" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string }>;

async function EssaiContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = sp.site && sp.site !== "all" ? sp.site : null;
  const data = await getTrialDashboard(session, siteFilter);
  const sites = await loadSites(session);

  return (
    <TrialPage
      data={data}
      siteOptions={sites.map((s) => ({ id: s.id, nom: s.nom }))}
      canApprove={canApproveTrialExtension(session)}
    />
  );
}

export default function EssaiRoute({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <EssaiContent searchParams={searchParams} />
    </Suspense>
  );
}