"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs, Button, DataTable, ListSearchInput, toast } from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import { approveSyncBatchAction, refreshCloudAction } from "@/server/sync/actions";

type BatchRow = { id: string; createdAt: string; changesCount: number };

export function SyncPage({
  remoteVersion,
  batches,
  canApprove,
}: {
  remoteVersion: number;
  batches: BatchRow[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [approvingBatchId, setApprovingBatchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredBatches = useMemo(
    () =>
      batches.filter((r) =>
        matchesListSearch(search, [r.id, r.createdAt, r.changesCount, String(r.changesCount)]),
      ),
    [batches, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucun lot");

  const columns: Column<BatchRow>[] = [
    { key: "id", header: "Lot", render: (r) => r.id },
    { key: "c", header: "Modifications", render: (r) => String(r.changesCount) },
    { key: "d", header: "Créé", render: (r) => r.createdAt },
    {
      key: "act",
      header: "",
      render: (r) =>
        canApprove ? (
          <Button
            type="button"
            variant="secondary"
            loading={approvingBatchId === r.id}
            onClick={() => {
              setApprovingBatchId(r.id);
              startTransition(async () => {
                try {
                  const res = await approveSyncBatchAction(r.id);
                  if (!res.ok) toast(res.error.message, "danger");
                  else {
                    toast("Lot approuvé", "success");
                    router.refresh();
                  }
                } finally {
                  setApprovingBatchId(null);
                }
              });
            }}
          >
            Approuver
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Synchronisation" }]} />
      <h1 className="text-2xl font-bold text-ink">Synchronisation cloud</h1>
      <p className="text-sm text-muted">
        Version distante : <strong className="text-ink">{remoteVersion}</strong> — pas de sync Wi‑Fi LAN sur le web.
      </p>
      <Button
        type="button"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await refreshCloudAction();
            if (!res.ok) toast(res.error.message, "danger");
            else {
              toast("Données cloud actualisées", "success");
              router.refresh();
            }
          })
        }
      >
        Tirer le cloud
      </Button>
      <h2 className="text-lg font-semibold">Lots en attente</h2>
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Identifiant du lot, date, nombre de modifications…"
        id="sync-search"
      />
      <DataTable
        columns={columns}
        rows={filteredBatches}
        rowKey={(r) => r.id}
        emptyTitle={emptyCopy.emptyTitle}
        emptyDescription={emptyCopy.emptyDescription}
      />
    </div>
  );
}