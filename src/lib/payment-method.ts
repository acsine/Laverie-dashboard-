const LABELS: Record<string, string> = {
  cash: "Espèces",
  mobileMoney: "Mobile Money",
  card: "Carte",
  bankTransfer: "Virement",
};

export function paymentMethodLabel(method: string): string {
  const key = method?.trim();
  if (!key) return "—";
  return LABELS[key] ?? key;
}