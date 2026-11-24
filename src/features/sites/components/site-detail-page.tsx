"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";
import { Breadcrumbs, Badge, Button, KpiCard, toast } from "@/components/ui";
import { saveSiteAction } from "@/server/sites/actions";
import type { SiteDetailPack } from "@/server/sites/get-site-detail";

type Props = {
  detail: SiteDetailPack;
  listHref: string;
  editHref: string;
  canManage: boolean;
};

export function SiteDetailPage({ detail, listHref, editHref, canManage }: Props) {
  const router = useRouter();
  const [togglePending, startToggle] = useTransition();

  const site = detail.site;

  const trialTone =
    !detail.trial.endLabel || detail.trial.endLabel === "—"
      ? "neutral"
      : detail.trial.isExpired
        ? "danger"
        : detail.trial.remainingDays != null && detail.trial.remainingDays <= 7
          ? "warning"
          : "success";

  function toggleActive() {
    startToggle(async () => {
      const next = !site.isActive;
      const res = await saveSiteAction({
        id: site.id,
        nom: site.nom,
        adresse: site.adresse,
        ville: site.ville,
        pays: site.pays,
        telephone: site.telephone ?? undefined,
        isActive: next,
      });
      if (!res.ok) {
        toast(res.error.message, "danger");
        return;
      }
      toast(next ? "Site activé" : "Site désactivé", "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Plateforme" },
          { label: "Sites", href: listHref },
          { label: site.nom },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-panel bg-primary/15 text-primary">
            <Building2 className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink">{site.nom}</h1>
            <p className="font-mono text-xs text-muted">{site.id}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge tone={site.isActive ? "success" : "neutral"}>
                {site.isActive ? "Actif" : "Inactif"}
              </Badge>
              <Badge tone={trialTone}>
                {detail.trial.endLabel === "—"
                  ? "Essai non configuré"
                  : detail.trial.isExpired
                    ? "Essai expiré"
                    : `${detail.trial.remainingDays ?? "?"} j d'essai`}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={listHref}>
            <Button type="button" variant="ghost">
              Retour à la liste
            </Button>
          </Link>
          {canManage && (
            <>
              <Button
                type="button"
                variant="secondary"
                loading={togglePending}
                onClick={toggleActive}
              >
                {site.isActive ? "Désactiver le site" : "Activer le site"}
              </Button>
              <Link href={editHref}>
                <Button type="button" variant="secondary">
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <dl className="grid gap-2 rounded-panel border border-line bg-primary-softer/20 p-3 text-sm sm:grid-cols-2">
        <DetailField
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Adresse"
          value={[site.adresse, site.ville, site.pays].filter(Boolean).join(" · ") || "—"}
        />
        <DetailField
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Téléphone"
          value={site.telephone ?? "—"}
        />
        <DetailField label="Fin d'essai" value={detail.trial.endLabel} />
        <DetailField
          label="Gérant / admin"
          value={
            detail.siteAdmins.length
              ? detail.siteAdmins.map((a) => `${a.name} (${a.email || "sans e-mail"})`).join(" · ")
              : "Aucun administrateur actif"
          }
        />
      </dl>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-ink">KPI — {detail.kpis.periodLabel}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <KpiCard label="Commandes" value={String(detail.kpis.commandes)} />
          <KpiCard label="Clients" value={String(detail.kpis.clients)} />
          <KpiCard label="Employés" value={String(detail.kpis.employes)} />
          <KpiCard label="CA" value={detail.kpis.caLabel} />
          <KpiCard label="Marge" value={detail.kpis.margeLabel} />
        </div>
      </section>

      {detail.alerts.length > 0 && (
        <ul className="space-y-1 text-sm">
          {detail.alerts.map((a) => (
            <li
              key={a.id}
              className={
                a.tone === "danger"
                  ? "text-danger"
                  : a.tone === "warning"
                    ? "text-warning"
                    : "text-muted"
              }
            >
              {a.label}
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Users className="h-4 w-4 text-primary" />
          Équipe ({detail.staffCounts.total} actifs)
        </div>
        {detail.staffCounts.byRole.length > 0 ? (
          <p className="text-xs text-muted">
            {detail.staffCounts.byRole.map((r) => `${r.count} ${r.label}`).join(" · ")}
          </p>
        ) : (
          <p className="text-xs text-muted">Aucun employé actif sur ce site.</p>
        )}
      </section>

      {detail.recentOrders.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-ink">Dernières commandes</h2>
          <ul className="divide-y divide-line rounded-panel border border-line text-sm">
            {detail.recentOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="font-medium text-ink">{o.invoiceNumber ?? o.id.slice(0, 8)}</span>
                <span className="text-muted">{o.statusLabel}</span>
                <span className="font-semibold text-ink">{o.totalLabel}</span>
                <span className="text-xs text-muted">{o.createdLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 border-t border-line pt-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Actions gérant du site</h2>
          <p className="text-xs text-muted">
            Écrans métier filtrés sur ce site — comme depuis le poste du gérant d&apos;agence.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {detail.gerantActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group flex items-start gap-3 rounded-panel border border-line bg-surface px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary-softer/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink group-hover:text-primary">{action.label}</p>
                <p className="text-xs text-muted">{action.description}</p>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-muted">
        {icon}
        {label}
      </dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}