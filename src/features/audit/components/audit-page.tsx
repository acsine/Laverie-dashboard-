"use client";

import { useMemo, useState } from "react";
import { Breadcrumbs, DataTable, ListSearchInput } from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import type { AuditRow } from "@/server/audit/get-audit";

type Props = {
  rows: AuditRow[];
  loadError?: string;
  siteId?: string | null;
  siteLabel?: string | null;
  isPlatform?: boolean;
  sites?: { id: string; nom: string }[];
};

export function AuditPage({
  rows,
  loadError,
  siteId = null,
  siteLabel,
  isPlatform = false,
  sites = [],
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        matchesListSearch(search, [r.id, r.action, r.actor, r.siteId, r.createdAt, r.details]),
      ),
    [rows, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucune entrée");

  const columns: Column<AuditRow>[] = [
    { key: "a", header: "Action", render: (r) => r.action },
    { key: "act", header: "Acteur", render: (r) => r.actor },
    { key: "s", header: "Site", render: (r) => r.siteId ?? "—" },
    { key: "d", header: "Date", render: (r) => r.createdAt },
    { key: "det", header: "Détail", render: (r) => r.details.slice(0, 80) },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Audit" }]} />
      <h1 className="text-2xl font-bold text-ink">Journal d&apos;audit</h1>
      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId}
        siteLabel={siteLabel}
        showPicker={false}
      />
      <p className="text-sm text-muted">Lecture seule · 200 derniers événements.</p>
      {loadError && (
        <p className="rounded-panel border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </p>
      )}
      {!loadError && rows.length === 0 && (
        <p className="rounded-panel border border-line bg-primary-softer/30 px-3 py-2 text-sm text-muted">
          Aucune entrée pour l&apos;instant. Les actions admin web et mobile (sites, cartes fidélité,
          etc.) alimentent <code className="text-xs">lav_audit_log</code>.
        </p>
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Action, acteur, site, date, détail…"
        id="audit-search"
      />
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        emptyTitle={emptyCopy.emptyTitle}
        emptyDescription={emptyCopy.emptyDescription}
      />
    </div>
  );
}