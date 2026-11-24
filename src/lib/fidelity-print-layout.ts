/** Calé sur `FidelityCardPdfService` (Flutter) — grille A4 2×4. */
export const FIDELITY_PRINT = {
  cardsPerPage: 8,
  gridCols: 2,
  gridRows: 4,
  pageMarginMm: 3.5,
  gridGapMm: 1.8,
  cardAspect: 1024 / 640,
} as const;

/** Largeur utile d’une carte sur page A4 (mm), pour l’impression navigateur. */
export function fidelityCardWidthMm(): number {
  const pageW = 210;
  const pageH = 297;
  const innerW = pageW - 2 * FIDELITY_PRINT.pageMarginMm;
  const innerH = pageH - 2 * FIDELITY_PRINT.pageMarginMm;
  const hGaps = (FIDELITY_PRINT.gridCols - 1) * FIDELITY_PRINT.gridGapMm;
  const vGaps = (FIDELITY_PRINT.gridRows - 1) * FIDELITY_PRINT.gridGapMm;

  let cardW = (innerW - hGaps) / FIDELITY_PRINT.gridCols;
  let cardH = cardW / FIDELITY_PRINT.cardAspect;
  const totalH = FIDELITY_PRINT.gridRows * cardH + vGaps;
  if (totalH > innerH) {
    cardH = (innerH - vGaps) / FIDELITY_PRINT.gridRows;
    cardW = cardH * FIDELITY_PRINT.cardAspect;
  }
  return cardW;
}

export function fidelityCardHeightMm(): number {
  return fidelityCardWidthMm() / FIDELITY_PRINT.cardAspect;
}

export function chunkCards<T>(items: T[], size = FIDELITY_PRINT.cardsPerPage): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

/**
 * Une seule carte → 8 exemplaires sur la feuille (même client).
 * Plusieurs cartes → jusqu’à 8 par page A4 (clients différents).
 */
export function prepareFidelityPrintCards<T>(cards: T[]): T[] {
  if (cards.length === 0) return [];
  if (cards.length === 1) {
    return Array.from({ length: FIDELITY_PRINT.cardsPerPage }, () => cards[0]!);
  }
  return cards;
}