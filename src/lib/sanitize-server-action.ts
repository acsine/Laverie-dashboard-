/** Valeurs fantômes envoyées par les Server Actions (ex. `undefined` → "$undefined"). */
export function cleanOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s || s === "$undefined" || s === "undefined") return undefined;
  return s;
}