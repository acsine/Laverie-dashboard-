/** Normalise `serviceIds` (mobile, Supabase texte, JSON ou tableau). */
export function parseOrderServiceIds(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).trim()).filter(Boolean);
  }

  let str = String(raw).trim();
  if (!str) return [];

  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed: unknown = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((e) => String(e).trim()).filter(Boolean);
      }
    } catch {
      str = str.slice(1, -1);
    }
  } else if (str.startsWith("{") && str.endsWith("}")) {
    str = str.slice(1, -1);
  }

  return str
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}