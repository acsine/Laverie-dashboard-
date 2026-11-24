export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Chaque mot saisi doit apparaître dans au moins un des champs (recherche précise multi-termes).
 */
export function matchesListSearch(
  query: string,
  fields: (string | number | null | undefined)[],
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const haystack = fields
    .map((f) => (f == null ? "" : String(f)).toLowerCase())
    .join(" ");
  return tokens.every((token) => haystack.includes(token));
}

export function listSearchEmptyCopy(query: string, defaultTitle: string) {
  const q = query.trim();
  if (!q) {
    return { emptyTitle: defaultTitle, emptyDescription: undefined as string | undefined };
  }
  return {
    emptyTitle: "Aucun résultat",
    emptyDescription: `Aucune ligne ne correspond à « ${q} ».`,
  };
}