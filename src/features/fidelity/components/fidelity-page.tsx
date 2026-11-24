"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CreditCard, Printer } from "lucide-react";
import {
  Badge,
  Breadcrumbs,
  Button,
  DataTable,
  IconActionButton,
  Input,
  ListSearchInput,
  KpiCard,
  Modal,
  Select,
  toast,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import type { FidelityCardRow, FidelityProgramme } from "@/server/fidelity/get-fidelity";
import {
  deleteFidelityCardAction,
  issueFidelityCardAction,
  type IssuedFidelityCardDto,
} from "@/server/fidelity/actions";
import { formatDate } from "@/lib/format";
import { buildLinearBarcodeValue, buildQrPayload, formatSerial } from "@/lib/fidelity-format";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import { FidelityCardPreview } from "./card-preview";
import { FidelityPrintPortal, cardRowToPreview } from "./fidelity-print-portal";
import type { CardPreviewData } from "./card-preview";
import { FidelityPrintSelectModal } from "./fidelity-print-select-modal";
import { useConfirm } from "@/hooks/use-confirm";

type CustomerOption = { id: string; label: string };

type Props = {
  programmes: FidelityProgramme[];
  cards: FidelityCardRow[];
  nextSerial: number;
  customerOptions: CustomerOption[];
};

function defaultValidUntilInput(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const statusTone = (s: string): "success" | "warning" | "danger" | "neutral" => {
  if (s === "active") return "success";
  if (s === "suspended" || s === "suspendue") return "warning";
  if (s === "revoked" || s === "expiree") return "danger";
  return "neutral";
};

function issuedToRow(
  issued: IssuedFidelityCardDto,
  programmeLabel: string,
): FidelityCardRow {
  return {
    id: issued.id,
    programmeId: issued.programmeId,
    programmeLabel,
    customerId: issued.customerId,
    detenteurNom: issued.detenteurNom,
    numeroSerie: issued.numeroSerie,
    codeBarre: issued.codeBarre,
    qrPayload: issued.qrPayload,
    statut: issued.statut,
    issuedAt: issued.issuedAt,
    issuedLabel: formatDate(issued.issuedAt),
    validUntil: issued.validUntil,
    validUntilLabel: formatDate(issued.validUntil),
    effectiveStatut: "active",
  };
}

export function FidelityPage({ programmes, cards, nextSerial, customerOptions }: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState(defaultValidUntilInput);
  const selectedCustomerLabel = useMemo(
    () => customerOptions.find((c) => c.id === customerId)?.label ?? "",
    [customerOptions, customerId],
  );
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id ?? "");
  const programmeLabel = programmes.find((p) => p.id === programmeId)?.libelle ?? "—";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [printCards, setPrintCards] = useState<CardPreviewData[] | null>(null);
  const [printPickerOpen, setPrintPickerOpen] = useState(false);
  const [printPickerInitial, setPrintPickerInitial] = useState<string[]>([]);
  const [extraPrintRows, setExtraPrintRows] = useState<FidelityCardRow[]>([]);

  const cardsForPrint = useMemo(() => {
    const map = new Map(cards.map((c) => [c.id, c]));
    for (const row of extraPrintRows) map.set(row.id, row);
    return [...map.values()];
  }, [cards, extraPrintRows]);

  const validUntilIsoPreview = useMemo(
    () => (validUntil ? `${validUntil}T23:59:59.999Z` : null),
    [validUntil],
  );

  const preview = useMemo(() => {
    const numeroSerie = formatSerial(nextSerial);
    const holder = selectedCustomerLabel.trim()
      ? selectedCustomerLabel.trim().toUpperCase()
      : "CLIENT";
    return {
      detenteurNom: holder,
      numeroSerie,
      codeBarre: buildLinearBarcodeValue(nextSerial),
      qrPayload: buildQrPayload(holder, numeroSerie),
      validUntil: validUntilIsoPreview,
    };
  }, [selectedCustomerLabel, nextSerial, validUntilIsoPreview]);

  const filteredCards = useMemo(
    () =>
      cards.filter((r) =>
        matchesListSearch(search, [
          r.id,
          r.numeroSerie,
          r.detenteurNom,
          r.programmeLabel,
          r.statut,
          r.effectiveStatut,
          r.validUntilLabel,
          r.issuedLabel,
        ]),
      ),
    [cards, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucune carte");

  function openPrintPicker(initialIds: string[] = []) {
    setPrintPickerInitial(initialIds);
    setPrintPickerOpen(true);
  }

  function onPrintConfirm(selected: FidelityCardRow[]) {
    setPrintCards(selected.map(cardRowToPreview));
  }

  const columns: Column<FidelityCardRow>[] = [
    {
      key: "serie",
      header: "N° série",
      render: (r) => <span className="font-semibold tabular-nums">{r.numeroSerie}</span>,
    },
    {
      key: "nom",
      header: "Client",
      render: (r) =>
        r.customerId ? (
          <Link href={`/clients/${encodeURIComponent(r.customerId)}`} className="text-primary hover:underline">
            {r.detenteurNom}
          </Link>
        ) : (
          r.detenteurNom
        ),
    },
    { key: "prog", header: "Programme", render: (r) => r.programmeLabel },
    { key: "valid", header: "Validité", render: (r) => r.validUntilLabel },
    {
      key: "statut",
      header: "Statut",
      render: (r) => (
        <Badge tone={statusTone(r.effectiveStatut)}>
          {r.effectiveStatut}
          {r.effectiveStatut !== r.statut ? ` (${r.statut})` : ""}
        </Badge>
      ),
    },
    { key: "issued", header: "Émise le", render: (r) => r.issuedLabel },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-0.5">
          <IconActionButton
            icon={Printer}
            title="Imprimer"
            aria-label={`Imprimer ${r.numeroSerie}`}
            onClick={() => openPrintPicker([r.id])}
          />
          <IconActionButton
            icon={Trash2}
            tone="danger"
            aria-label="Révoquer la carte"
            loading={deletingId === r.id}
            onClick={() => onDelete(r.id)}
          />
        </div>
      ),
    },
  ];

  function onIssue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      toast("Sélectionnez un client", "danger");
      return;
    }
    if (!validUntil) {
      toast("Indiquez une date de fin de validité", "danger");
      return;
    }
    startTransition(async () => {
      const result = await issueFidelityCardAction({
        programmeId,
        customerId,
        validUntil,
      });
      if (!result.ok) {
        setError(result.error.message);
        toast(result.error.message, "danger");
        return;
      }
      toast(`Carte ${result.data.numeroSerie} émise`, "success");
      const row = issuedToRow(result.data, programmeLabel);
      setExtraPrintRows([row]);
      setOpen(false);
      setCustomerId("");
      setValidUntil(defaultValidUntilInput());
      setPrintPickerInitial([result.data.id]);
      setPrintPickerOpen(true);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    confirm(
      {
        title: "Révoquer la carte",
        description: "Révoquer cette carte de fidélité ?",
        confirmLabel: "Révoquer",
      },
      () => {
        setDeletingId(id);
        startTransition(async () => {
          const result = await deleteFidelityCardAction(id);
          setDeletingId(null);
          if (!result.ok) {
            toast(result.error.message, "danger");
            return;
          }
          toast("Carte révoquée", "success");
          router.refresh();
        });
      },
    );
  }

  const activeCount = cards.filter((c) => c.effectiveStatut === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Plateforme", href: "/" }, { label: "Fidélité" }]} />
          <h1 className="mt-2 text-[28px] font-bold text-ink">Fidélité</h1>
          <p className="mt-1 text-sm text-muted">
            Programmes et cartes Salam Wash Station — validité, QR unique, impression A4 (8 / feuille).
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Émettre une carte
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Cartes" value={String(cards.length)} icon={CreditCard} />
        <KpiCard label="Actives" value={String(activeCount)} />
        <KpiCard label="Programmes" value={String(programmes.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {programmes.map((p) => (
          <div
            key={p.id}
            className="rounded-panel border border-line bg-surface p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {p.tier}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{p.libelle}</h2>
                <p className="mt-1 text-sm text-muted">
                  {p.lavagesParMois} lavage(s) / mois
                </p>
              </div>
              <Badge tone={p.isActive ? "success" : "neutral"}>
                {p.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">Cartes émises</h2>
          <Button
            type="button"
            variant="secondary"
            disabled={cardsForPrint.length === 0}
            onClick={() => openPrintPicker()}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimer…
          </Button>
        </div>
        <p className="mb-2 text-xs text-muted">
          Plusieurs cartes par client (validités différentes). Le QR intègre la date de fin ; après
          expiration la carte n&apos;est plus acceptée. Sélectionnez les cartes avant impression (8 par
          feuille A4).
        </p>
        <ListSearchInput
          value={search}
          onChange={setSearch}
          placeholder="N° série, détenteur, programme, statut, validité…"
          id="fidelity-search"
          className="mb-3"
        />
        <DataTable
          columns={columns}
          rows={filteredCards}
          rowKey={(r) => r.id}
          emptyTitle={emptyCopy.emptyTitle}
          emptyDescription={
            search.trim()
              ? emptyCopy.emptyDescription
              : "Émettez la première carte de fidélité."
          }
        />
      </div>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Émettre une carte"
        className="sm:max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button form="issue-card-form" type="submit" loading={pending}>
              Émettre
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <form id="issue-card-form" onSubmit={onIssue} className="flex flex-col gap-4">
            <Select
              label="Programme"
              value={programmeId}
              onChange={setProgrammeId}
              options={programmes.map((p) => ({
                value: p.id,
                label: `${p.libelle} (${p.lavagesParMois}/mois)`,
              }))}
            />
            <Select
              label="Client"
              value={customerId}
              onChange={setCustomerId}
              options={[
                { value: "", label: "— Choisir un client —" },
                ...customerOptions.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
            <Input
              label="Fin de validité"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
            <p className="text-xs text-muted">
              Plusieurs cartes possibles pour le même client (dates différentes). Le QR et le libellé
              sur la carte varient selon la validité.
            </p>
            {error && (
              <p className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </form>
          <FidelityCardPreview data={preview} />
        </div>
      </Modal>

      <FidelityPrintSelectModal
        open={printPickerOpen}
        onClose={() => setPrintPickerOpen(false)}
        cards={cardsForPrint}
        initialSelectedIds={printPickerInitial}
        onConfirm={onPrintConfirm}
      />

      {confirmDialog}
      {printCards && (
        <FidelityPrintPortal cards={printCards} onDone={() => setPrintCards(null)} />
      )}
    </div>
  );
}