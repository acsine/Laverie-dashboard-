"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Breadcrumbs, Badge, Button, DataTable, Input, KpiCard, ListSearchInput, toast } from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import type { SiteTrialRow, TrialDashboard, TrialSnapshot } from "@/server/trial/get-trial";
import { approveTrialExtensionAction, requestTrialExtensionAction } from "@/server/trial/actions";

type Props = {
  data: TrialDashboard;
  siteOptions: { id: string; nom: string }[];
  canApprove: boolean;
};

function statusBadge(snap: TrialSnapshot) {
  if (!snap.trialEndAt) return <Badge tone="neutral">Non configuré</Badge>;
  if (snap.isExpired) return <Badge tone="danger">Expiré</Badge>;
  if (snap.remainingDays != null && snap.remainingDays <= 7) {
    return <Badge tone="warning">{snap.remainingDays} j restants</Badge>;
  }
  return <Badge tone="success">Actif</Badge>;
}

function SnapshotCard({ title, snap }: { title: string; snap: TrialSnapshot }) {
  return (
    <div className="space-y-3 rounded-panel border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {statusBadge(snap)}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Fin d&apos;essai</dt>
          <dd className="font-semibold text-ink">{snap.endLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Durée initiale (mois)</dt>
          <dd className="font-semibold text-ink">{snap.trialDurationMonths ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Jours restants</dt>
          <dd className="font-semibold text-ink">
            {snap.remainingDays != null ? snap.remainingDays : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Version cloud</dt>
          <dd className="font-semibold text-ink">{snap.remoteVersion ?? "—"}</dd>
        </div>
      </dl>
      {snap.extensionRequested && (
        <p className="text-sm text-warning">
          Une demande de prolongation est en attente (global).
        </p>
      )}
    </div>
  );
}

export function TrialPage({ data, siteOptions, canApprove }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [months, setMonths] = useState("3");
  const [pendingRequest, startRequest] = useTransition();
  const [pendingApprove, startApprove] = useTransition();
  const [siteSearch, setSiteSearch] = useState("");

  const primary = data.site ?? data.global;

  const filteredSites = useMemo(
    () =>
      data.sites.filter((r) =>
        matchesListSearch(siteSearch, [
          r.siteId,
          r.siteName,
          r.ville,
          r.endLabel,
          r.remainingDays,
          r.isExpired ? "expiré" : "actif",
        ]),
      ),
    [data.sites, siteSearch],
  );

  const siteEmpty = listSearchEmptyCopy(siteSearch, "Aucun site");

  const siteColumns: Column<SiteTrialRow>[] = [
    { key: "nom", header: "Site", render: (r) => <span className="font-medium">{r.siteName}</span> },
    { key: "ville", header: "Ville", render: (r) => r.ville || "—" },
    { key: "fin", header: "Fin essai", render: (r) => r.endLabel },
    {
      key: "j",
      header: "Jours",
      render: (r) =>
        r.remainingDays != null ? (
          <Badge tone={r.isExpired ? "danger" : r.remainingDays <= 7 ? "warning" : "success"}>
            {r.isExpired ? "Expiré" : `${r.remainingDays} j`}
          </Badge>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Essai & abonnement" }]} />
      <h1 className="text-2xl font-bold text-ink">Essai & abonnement</h1>
      <p className="text-sm text-muted">Données live Supabase · `app_config` et `lav_site_config`.</p>

      {data.isPlatform && siteOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted" htmlFor="trial-site-filter">
            Filtrer par site
          </label>
          <select
            id="trial-site-filter"
            className="h-11 rounded-control border border-line bg-surface px-3 text-sm"
            value={data.focusSiteId ?? "all"}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              const v = e.target.value;
              if (v === "all") params.delete("site");
              else params.set("site", v);
              router.push(`/essai?${params.toString()}`);
            }}
          >
            <option value="all">Tous les sites</option>
            {siteOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Jours restants (focus)"
          value={primary.remainingDays != null ? String(primary.remainingDays) : "—"}
        />
        <KpiCard label="Demande extension" value={data.global.extensionRequested ? "Oui" : "Non"} />
        <KpiCard
          label="Version globale"
          value={data.global.remoteVersion != null ? String(data.global.remoteVersion) : "—"}
        />
      </div>

      {data.isPlatform && <SnapshotCard title="Configuration globale" snap={data.global} />}

      {data.site && <SnapshotCard title="Essai du site" snap={data.site} />}

      {!data.isPlatform && !data.site && <SnapshotCard title="Essai" snap={data.global} />}

      {data.isPlatform && (
        <>
          <h2 className="text-lg font-semibold text-ink">Essai par site</h2>
          <ListSearchInput
            value={siteSearch}
            onChange={setSiteSearch}
            placeholder="Nom du site, ville, fin d'essai, jours restants…"
            id="trial-sites-search"
          />
          <DataTable
            columns={siteColumns}
            rows={filteredSites}
            rowKey={(r) => r.siteId}
            emptyTitle={siteEmpty.emptyTitle}
            emptyDescription={siteEmpty.emptyDescription}
          />
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          loading={pendingRequest}
          onClick={() =>
            startRequest(async () => {
              const res = await requestTrialExtensionAction();
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast("Demande envoyée", "success");
              router.refresh();
            })
          }
        >
          Demander une extension
        </Button>
      </div>

      {canApprove && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-panel border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startApprove(async () => {
              const res = await approveTrialExtensionAction(
                Number(months),
                data.focusSiteId,
              );
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast(
                data.focusSiteId
                  ? "Essai du site prolongé"
                  : "Essai global prolongé",
                "success",
              );
              router.refresh();
            });
          }}
        >
          <p className="w-full text-sm text-muted">
            Réservé au compte gestionnaire essai. Si un site est filtré ci-dessus, la prolongation
            s&apos;applique à <code className="text-xs">lav_site_config</code> ; sinon à la config
            globale <code className="text-xs">app_config</code>.
          </p>
          <Input
            label="Prolonger de (mois)"
            type="number"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
          <Button type="submit" loading={pendingApprove}>
            Approuver extension
          </Button>
        </form>
      )}
    </div>
  );
}