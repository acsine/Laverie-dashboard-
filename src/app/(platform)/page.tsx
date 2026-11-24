import type { Metadata } from "next";
import { Suspense } from "react";
import { Vue360View } from "@/features/dashboard/components/vue360-view";
import { loadSiteLabel } from "@/lib/parse-site-filter";
import { effectiveSiteId } from "@/server/auth/site-scope";
import { isPlatformUser, requireSession } from "@/server/auth/guards";
import { getVue360, type PeriodKey } from "@/server/dashboard/get-vue360";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Vue 360" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string; site?: string }>;

function isPeriod(v: string | undefined): v is PeriodKey {
  return v === "day" || v === "week" || v === "month" || v === "quarter" || v === "year";
}

async function Vue360Loader({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const period = isPeriod(sp.period) ? sp.period : "month";
  const siteId = effectiveSiteId(session, sp);
  const isPlatform = isPlatformUser(session);
  const siteLabel = await loadSiteLabel(siteId);

  try {
    const data = await getVue360({ period, siteId, isPlatform, siteLabel });
    return <Vue360View data={data} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de chargement";
    return (
      <div className="rounded-panel border border-danger/30 bg-danger/10 p-6 text-sm text-danger">
        Impossible de charger les données cloud : {message}
      </div>
    );
  }
}

export default function Vue360Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      }
    >
      <Vue360Loader searchParams={searchParams} />
    </Suspense>
  );
}
