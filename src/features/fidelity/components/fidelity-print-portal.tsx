"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CardPreviewData } from "./card-preview";
import { FidelityCardPreview } from "./card-preview";
import {
  FIDELITY_PRINT,
  chunkCards,
  fidelityCardHeightMm,
  fidelityCardWidthMm,
  prepareFidelityPrintCards,
} from "@/lib/fidelity-print-layout";

type Props = {
  cards: CardPreviewData[];
  onDone: () => void;
};

function cardWidthPx(): number {
  const mm = fidelityCardWidthMm();
  return (mm / 25.4) * 96;
}

export function FidelityPrintPortal({ cards, onDone }: Props) {
  const cardW = cardWidthPx();
  const cardHMm = fidelityCardHeightMm();
  const cardWMm = fidelityCardWidthMm();
  const prepared = prepareFidelityPrintCards(cards);
  const pages = chunkCards(prepared);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Cartes fidélité";

    const after = () => {
      document.title = prevTitle;
      onDone();
    };

    window.addEventListener("afterprint", after);

    const images = document.querySelectorAll("#fidelity-print-root img");
    let pending = images.length;
    const tryPrint = () => {
      pending -= 1;
      if (pending <= 0) {
        requestAnimationFrame(() => window.print());
      }
    };

    if (pending === 0) {
      const t = window.setTimeout(() => window.print(), 300);
      return () => {
        clearTimeout(t);
        window.removeEventListener("afterprint", after);
      };
    }

    images.forEach((img) => {
      const el = img as HTMLImageElement;
      if (el.complete) tryPrint();
      else {
        el.addEventListener("load", tryPrint, { once: true });
        el.addEventListener("error", tryPrint, { once: true });
      }
    });

    return () => {
      window.removeEventListener("afterprint", after);
    };
  }, [onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="fidelity-print-root" className="fidelity-print-root">
      {pages.map((page, pageIndex) => (
        <section key={pageIndex} className="fidelity-print-page">
          <div
            className="fidelity-print-grid"
            style={{
              gap: `${FIDELITY_PRINT.gridGapMm}mm`,
              gridTemplateColumns: `repeat(${FIDELITY_PRINT.gridCols}, ${cardWMm}mm)`,
              gridTemplateRows: `repeat(${FIDELITY_PRINT.gridRows}, ${cardHMm}mm)`,
            }}
          >
            {Array.from({ length: FIDELITY_PRINT.cardsPerPage }).map((_, slot) => {
              const data = page[slot];
              return (
                <div
                  key={slot}
                  className="fidelity-print-cell"
                  style={{
                    width: `${cardWMm}mm`,
                    height: `${cardHMm}mm`,
                  }}
                >
                  {data ? (
                    <FidelityCardPreview
                      data={data}
                      printWidthPx={cardW}
                      className="shadow-none fidelity-print-card"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>,
    document.body,
  );
}

export function cardRowToPreview(row: {
  detenteurNom: string;
  numeroSerie: string;
  codeBarre: string;
  qrPayload: string;
  validUntil?: string | null;
}): CardPreviewData {
  return {
    detenteurNom: row.detenteurNom,
    numeroSerie: row.numeroSerie,
    codeBarre: row.codeBarre,
    qrPayload: row.qrPayload,
    validUntil: row.validUntil ?? null,
  };
}