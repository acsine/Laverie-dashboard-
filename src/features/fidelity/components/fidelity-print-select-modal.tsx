"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui";
import type { FidelityCardRow } from "@/server/fidelity/get-fidelity";
import { formatDate } from "@/lib/format";
import { fidelityCardEffectiveStatut } from "@/lib/fidelity-card-status";

type Props = {
  open: boolean;
  onClose: () => void;
  cards: FidelityCardRow[];
  initialSelectedIds?: string[];
  onConfirm: (selected: FidelityCardRow[]) => void;
};

export function FidelityPrintSelectModal({
  open,
  onClose,
  cards,
  initialSelectedIds = [],
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(initialSelectedIds));
  }, [open, initialSelectedIds]);

  const selectable = useMemo(
    () =>
      cards.filter((c) => {
        const eff = fidelityCardEffectiveStatut(c.statut, c.validUntil);
        return eff !== "revoked";
      }),
    [cards],
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectable.map((c) => c.id)) : new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chosen = selectable.filter((c) => selected.has(c.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choisir les cartes à imprimer"
      className="sm:max-w-xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => {
              onConfirm(chosen);
              onClose();
            }}
          >
            Imprimer ({chosen.length}) — grille 8 / feuille
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Sélectionnez une ou plusieurs cartes (plusieurs clients ou plusieurs exemplaires du même client).
        Une seule carte sélectionnée = 8 copies sur la feuille.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line"
          checked={selectable.length > 0 && selected.size === selectable.length}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        Tout sélectionner ({selectable.length})
      </label>
      <ul className="max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto rounded-panel border border-line p-2">
        {selectable.length === 0 && (
          <li className="px-2 py-4 text-center text-sm text-muted">Aucune carte imprimable.</li>
        )}
        {selectable.map((c) => {
          const eff = fidelityCardEffectiveStatut(c.statut, c.validUntil);
          return (
            <li key={c.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-control px-2 py-2 hover:bg-primary-softer/50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
                  checked={selected.has(c.id)}
                  onChange={() => toggleOne(c.id)}
                />
                <span className="min-w-0 text-sm">
                  <span className="font-semibold tabular-nums">{c.numeroSerie}</span>
                  <span className="text-muted"> · </span>
                  {c.detenteurNom}
                  <span className="mt-0.5 block text-xs text-muted">
                    Fin : {c.validUntil ? formatDate(c.validUntil) : "—"} · {eff}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}