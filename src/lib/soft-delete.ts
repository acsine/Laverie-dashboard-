/** Ligne cloud / sync : masquer si suppression logique. */
export function isSoftDeleted(row: Record<string, unknown>): boolean {
  const d = row.deletedAt ?? row.deleted_at;
  if (d == null || d === "") return false;
  return true;
}

export function filterNotSoftDeleted<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.filter((r) => !isSoftDeleted(r));
}