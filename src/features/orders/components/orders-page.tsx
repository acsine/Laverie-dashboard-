"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import {
  Badge,
  Breadcrumbs,
  Button,
  DataTable,
  ListSearchInput,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import {
  ORDER_LIST_FILTERS,
  orderMatchesStatusFilter,
  orderStatusTone,
  type OrderListFilter,
} from "@/lib/order-status";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "@/server/orders/map-orders-list";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobileMoney: "Mobile Money",
  card: "Carte",
  bankTransfer: "Virement",
};

type Props = {
  rows: OrderListRow[];
  canCreate: boolean;
  siteLabel?: string | null;
  siteId?: string | null;
  isPlatform: boolean;
  sites: { id: string; nom: string }[];
};

export function OrdersPage({
  rows,
  canCreate,
  siteLabel,
  siteId,
  isPlatform,
  sites,
}: Props) {
  const router = useRouter();
  const [navPending, startNav] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderListFilter>("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!orderMatchesStatusFilter(r.status, statusFilter)) return false;
      return matchesListSearch(search, [
        r.id,
        r.label,
        r.customerName,
        r.customerPhone,
        r.vehicleLabel,
        r.status,
        r.statusLabel,
        r.totalLabel,
        r.paymentMethod,
        r.pickupCode,
        r.createdAt,
      ]);
    });
  }, [rows, search, statusFilter]);

  const emptyCopy = listSearchEmptyCopy(search, "Aucune commande");

  const columns: Column<OrderListRow>[] = [
    {
      key: "id",
      header: "Commande",
      render: (r) => (
        <Link className="font-semibold text-primary hover:underline" href={`/commandes/${r.id}`}>
          {r.label}
        </Link>
      ),
    },
    {
      key: "cust",
      header: "Client",
      render: (r) => (
        <div>
          <p className="font-medium">{r.customerName}</p>
          {r.customerPhone && <p className="text-xs text-muted">{r.customerPhone}</p>}
        </div>
      ),
    },
    { key: "veh", header: "Véhicule", render: (r) => r.vehicleLabel },
    { key: "amt", header: "Montant", render: (r) => r.totalLabel },
    {
      key: "st",
      header: "Statut",
      render: (r) => <Badge tone={orderStatusTone(r.status)}>{r.statusLabel}</Badge>,
    },
    {
      key: "pay",
      header: "Paiement",
      className: "hidden md:table-cell",
      render: (r) => PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod,
    },
    { key: "dt", header: "Créée", className: "hidden lg:table-cell", render: (r) => r.createdAt },
  ];

  const newOrderHref = siteId
    ? `/commandes/nouvelle?site=${encodeURIComponent(siteId)}`
    : "/commandes/nouvelle";

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Commandes" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Commandes</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={siteId ? `/commandes/suivi?site=${encodeURIComponent(siteId)}` : "/commandes/suivi"}>
            <Button type="button" variant="secondary">
              Suivi (colonnes)
            </Button>
          </Link>
          {canCreate && (
            <Button
              type="button"
              loading={navPending}
              disabled={isPlatform && !siteId}
              title={isPlatform && !siteId ? "Choisissez un site (filtre en haut)" : undefined}
              onClick={() => startNav(() => router.push(newOrderHref))}
            >
              Nouvelle commande
            </Button>
          )}
        </div>
      </div>

      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId ?? null}
        siteLabel={siteLabel}
        showPicker={false}
      />

      <div className="flex flex-wrap gap-1 rounded-control border border-line bg-surface p-1">
        {ORDER_LIST_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "min-h-9 rounded-control px-3 text-xs font-medium",
              statusFilter === f.id
                ? "bg-primary text-white"
                : "text-muted hover:bg-primary-softer hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Client, téléphone, véhicule, code retrait, n° facture…"
        id="orders-search"
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