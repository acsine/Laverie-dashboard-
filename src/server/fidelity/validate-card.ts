import { isFidelityCardUsable } from "@/lib/fidelity-card-status";

/** Contrôle caisse / scan : carte utilisable (active et non expirée). */
export function validateFidelityCardForUse(card: {
  statut: string;
  validUntil: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!isFidelityCardUsable(card.statut, card.validUntil)) {
    const reason =
      card.statut === "revoked"
        ? "Carte révoquée."
        : "Carte expirée ou inactive.";
    return { ok: false, reason };
  }
  return { ok: true };
}