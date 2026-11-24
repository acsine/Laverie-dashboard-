"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import {
  Breadcrumbs,
  Badge,
  Button,
  DataTable,
  Input,
  ListSearchInput,
  Modal,
  KpiCard,
  toast,
} from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import { approveExpenseAction, saveExpenseAction } from "@/server/finances/actions";

type RevenueRow = { id: string; label: string; amountLabel: string; date: string };
type ExpenseRow = { id: string; title: string; amountLabel: string; approved: boolean };

type Props = {
  caLabel: string;
  depensesLabel: string;
  margeLabel: string;
  revenues: RevenueRow[];
  expenses: ExpenseRow[];
  canEdit: boolean;
  siteLabel?: string | null;
  siteId?: string | null;
  isPlatform?: boolean;
  sites?: { id: string; nom: string }[];
};

export function FinancesPage({
  caLabel,
  depensesLabel,
  margeLabel,
  revenues,
  expenses,
  canEdit,
  siteLabel,
  siteId = null,
  isPlatform = false,
  sites = [],
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", description: "" });
  const [search, setSearch] = useState("");

  const filteredRevenues = useMemo(
    () => revenues.filter((r) => matchesListSearch(search, [r.id, r.label, r.amountLabel, r.date])),
    [revenues, search],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((r) =>
        matchesListSearch(search, [
          r.id,
          r.title,
          r.amountLabel,
          r.approved ? "approuvée" : "en attente",
        ]),
      ),
    [expenses, search],
  );

  const revEmpty = listSearchEmptyCopy(search, "Aucun revenu");
  const expEmpty = listSearchEmptyCopy(search, "Aucune dépense");

  const revColumns: Column<RevenueRow>[] = [
    { key: "l", header: "Libellé", render: (r) => r.label },
    { key: "a", header: "Montant", render: (r) => r.amountLabel },
    { key: "d", header: "Date", render: (r) => r.date },
  ];

  const expColumns: Column<ExpenseRow>[] = [
    { key: "t", header: "Dépense", render: (r) => r.title },
    { key: "a", header: "Montant", render: (r) => r.amountLabel },
    {
      key: "ap",
      header: "Approbation",
      render: (r) =>
        r.approved ? (
          <Badge tone="success">Approuvée</Badge>
        ) : canEdit ? (
          <Button
            type="button"
            variant="secondary"
            loading={approvingId === r.id}
            onClick={() => {
              setApprovingId(r.id);
              startTransition(async () => {
                try {
                  const res = await approveExpenseAction(r.id);
                  if (!res.ok) toast(res.error.message, "danger");
                  else {
                    toast("Dépense approuvée", "success");
                    router.refresh();
                  }
                } finally {
                  setApprovingId(null);
                }
              });
            }}
          >
            Approuver
          </Button>
        ) : (
          <Badge tone="warning">En attente</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Finances" }]} />
      <h1 className="text-2xl font-bold text-ink">Finances</h1>
      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId}
        siteLabel={siteLabel}
        canEdit={canEdit}
        requireSiteForEdit
        subject="les dépenses"
        showPicker={false}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Chiffre d'affaires" value={caLabel} />
        <KpiCard label="Dépenses" value={depensesLabel} />
        <KpiCard label="Marge" value={margeLabel} />
      </div>
      {canEdit && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isPlatform && !siteId}
          title={isPlatform && !siteId ? "Choisissez un site (filtre en haut)" : undefined}
        >
          Nouvelle dépense
        </Button>
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Libellé, montant, date, statut d'approbation…"
        id="finances-search"
      />
      <h2 className="text-lg font-semibold">Revenus</h2>
      <DataTable
        columns={revColumns}
        rows={filteredRevenues}
        rowKey={(r) => r.id}
        emptyTitle={revEmpty.emptyTitle}
        emptyDescription={revEmpty.emptyDescription}
      />
      <h2 className="text-lg font-semibold">Dépenses</h2>
      <DataTable
        columns={expColumns}
        rows={filteredExpenses}
        rowKey={(r) => r.id}
        emptyTitle={expEmpty.emptyTitle}
        emptyDescription={expEmpty.emptyDescription}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Dépense">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await saveExpenseAction({
                title: form.title,
                amount: Number(form.amount),
                description: form.description,
              });
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast("Dépense enregistrée", "success");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="Montant" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" loading={pending}>
            Enregistrer
          </Button>
        </form>
      </Modal>
    </div>
  );
}