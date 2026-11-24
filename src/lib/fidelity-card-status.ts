import { formatDate, formatDateTime } from "@/lib/format";

/** Statut affiché / utilisable en tenant compte de la date de fin. */
export function fidelityCardEffectiveStatut(
  statut: string,
  validUntil: string | null | undefined,
  now = new Date(),
): string {
  const s = statut.trim().toLowerCase();
  if (s === "revoked" || s === "révoquée") return "revoked";
  if (validUntil) {
    const end = new Date(validUntil);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) return "expiree";
  }
  return statut;
}

export function isFidelityCardUsable(
  statut: string,
  validUntil: string | null | undefined,
  now = new Date(),
): boolean {
  const eff = fidelityCardEffectiveStatut(statut, validUntil, now);
  return eff === "active";
}

export function formatValidUntilForCard(validUntil: string | null | undefined): string {
  if (!validUntil) return "Sans date de fin";
  return `Valide au ${formatDate(validUntil)}`;
}

/** Date courte alignée sur les champs du gabarit (sans encadré). */
export function formatExpiryOnCard(validUntil: string | null | undefined): string | null {
  if (!validUntil) return null;
  const label = formatDateTime(validUntil, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return label;
}

/** Fin de journée locale pour une date `YYYY-MM-DD` (formulaire). */
export function validUntilFromDateInput(dateInput: string): string {
  const d = dateInput.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error("Date de validité invalide");
  }
  return `${d}T23:59:59.999Z`;
}