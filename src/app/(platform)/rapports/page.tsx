import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports/components/reports-page";
import { isPlatformUser, requireSession } from "@/server/auth/guards";
import { effectiveSiteId } from "@/server/auth/site-scope";
import { loadSiteLabel } from "@/lib/parse-site-filter";
import { getVue360, type PeriodKey } from "@/server/dashboard/get-vue360";

export const metadata: Metadata = { title: "Rapports" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ period?: string; site?: string }> };

function isPeriod(v: string | undefined): v is PeriodKey {
  return v === "day" || v === "week" || v === "month" || v === "quarter" || v === "year";
}

export default async function RapportsRoute({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const period = isPeriod(sp.period) ? sp.period : "month";
  const siteId = effectiveSiteId(session, sp);
  const isPlatform = isPlatformUser(session);
  const siteLabel = await loadSiteLabel(siteId);
  const data = await getVue360({ period, siteId, isPlatform, siteLabel });

  return <ReportsPage data={data} siteLabel={siteLabel} isPlatform={isPlatform} />;
}