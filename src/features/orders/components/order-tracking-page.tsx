"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import { Badge, Breadcrumbs, Button, ListSearchInput } from "@/components/ui";
import { matchesListSearch } from "@/lib/list-search";
import { normalizeOrderStatus, orderStatusLabel, orderStatusTone } from "@/lib/order-status";
import type { OrderListRow } from "@/server/orders/map-orders-list";

type ColumnKey = "waiting" | "inProgress" | "completed" | "delivered";

const COLUMNS: { key: ColumnKey; title: string; match: (s: string) => boolean }[] = [
  {
    key: "waiting",
    title: "En attente",
    match: (s) => {
      const c = normalizeOrderStatus(s);
      return c === "waiting" || c === "assigned";
    },
  },
  { key: "inProgress", title: "En cours", match: (s) => normalizeOrderStatus(s) === "inProgress" },
  { key: "completed", title: "Terminées", match: (s) => normalizeOrderStatus(s) === "completed" },
  { key: "delivered", title: "Livrées", match: (s) => normalizeOrderStatus(s) === "delivered" },
];

type Props = {
  rows: OrderListRow[];
  siteLabel?: string | null;
  siteId?: string | null;
  isPlatform: boolean;
  sites: { id: string; nom: string }[];
};

export function OrderTrackingPage({ rows, siteLabel, siteId, isPlatform, sites }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        matchesListSearch(search, [
          r.customerName,
          r.customerPhone,
          r.vehicleLabel,
          r.label,
          r.pickupCode,
        ]),
      ),
    [rows, search],
  );

  const byColumn = useMemo(() => {
    const out: Record<ColumnKey, OrderListRow[]> = {
      waiting: [],
      inProgress: [],
      completed: [],
      delivered: [],
    };
    for (const r of filtered) {
      if (normalizeOrderStatus(r.status) === "cancelled") continue;
      for (const col of COLUMNS) {
        if (col.match(r.status)) {
          out[col.key].push(r);
          break;
        }
      }
    }
    return out;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: "Commandes", href: "/commandes" }, { label: "Suivi" }]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink">Suivi des commandes</h1>
        <Link href={siteId ? `/commandes?site=${encodeURIComponent(siteId)}` : "/commandes"}>
          <Button type="button" variant="secondary">
            Liste
          </Button>
        </Link>
      </div>
      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId ?? null}
        siteLabel={siteLabel}
        showPicker={false}
      />
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Client, téléphone, véhicule…"
        id="order-tracking-search"
      />
      <div className="grid gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-panel border border-line bg-surface p-3 shadow-card">
            <h2 className="mb-2 text-sm font-bold text-ink">
              {col.title}{" "}
              <span className="font-normal text-muted">({byColumn[col.key].length})</span>
            </h2>
            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
              {byColumn[col.key].map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/commandes/${r.id}`}
                    className="block rounded-control border border-line bg-bg p-2 text-sm hover:border-primary/40 hover:bg-primary-softer/30"
                  >
                    <p className="font-semibold text-primary">{r.label}</p>
                    <p className="text-ink">{r.customerName}</p>
                    <p className="text-xs text-muted">{r.vehicleLabel}</p>
                    <Badge tone={orderStatusTone(r.status)} className="mt-1">
                      {orderStatusLabel(r.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
              {byColumn[col.key].length === 0 && (
                <li className="text-xs text-muted">Aucune commande</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}