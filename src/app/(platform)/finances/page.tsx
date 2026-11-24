import type { Metadata } from "next";
import { FinancesPage } from "@/features/finances/components/finances-page";
import { loadSiteLabel, parseSiteFilter } from "@/lib/parse-site-filter";
import { canDirectPush, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites, loadWorkspaceEntities } from "@/server/entities/load-entities";
import { formatFcfa } from "@/lib/format";

export const metadata: Metadata = { title: "Finances" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ site?: string }>;

export default async function FinancesRoute({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  const siteFilter = parseSiteFilter(sp);
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const siteLabel = await loadSiteLabel(siteId);
  const isPlatform = isPlatformUser(session);
  const sites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  const revenues = ((entities.revenues ?? []) as Record<string, unknown>[]);
  const expenses = ((entities.expenses ?? []) as Record<string, unknown>[]);
  const ca = revenues.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const dep = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const revenueRows = revenues.map((r) => ({
    id: String(r.id),
    label: String(r.description ?? r.orderId ?? r.id),
    amountLabel: formatFcfa(Number(r.amount ?? 0)),
    date: String(r.date ?? "—"),
  }));

  const expenseRows = expenses.map((e) => ({
    id: String(e.id),
    title: String(e.title ?? "Dépense"),
    amountLabel: formatFcfa(Number(e.amount ?? 0)),
    approved: e.isApproved === true,
  }));

  return (
    <FinancesPage
      caLabel={formatFcfa(ca)}
      depensesLabel={formatFcfa(dep)}
      margeLabel={formatFcfa(ca - dep)}
      revenues={revenueRows}
      expenses={expenseRows}
      canEdit={canDirectPush(session)}
      siteLabel={siteLabel}
      siteId={siteId}
      isPlatform={isPlatform}
      sites={sites}
    />
  );
}