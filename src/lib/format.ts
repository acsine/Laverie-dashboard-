const FCFA = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  maximumFractionDigits: 0,
});

const DOUALA = "Africa/Douala";

/** Montants en FCFA sans décimales */
export function formatFcfa(amount: number): string {
  return `${FCFA.format(Math.round(amount))} FCFA`;
}

/** Affiche une date/heure en fuseau Africa/Douala */
export function formatDateTime(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  },
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: DOUALA }).format(date);
}

export function formatDate(value: Date | string | null | undefined): string {
  return formatDateTime(value, { dateStyle: "medium" });
}
