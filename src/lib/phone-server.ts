import { normalizePhoneNumber } from "@/lib/phone";

/** Valide et renvoie le numéro en E.164 pour persistance. */
export function requireNormalizedPhone(
  phone: string,
  countryHint: string | null | undefined,
): { ok: true; e164: string } | { ok: false; message: string } {
  const result = normalizePhoneNumber(phone, countryHint);
  if (!result.ok) return result;
  return { ok: true, e164: result.e164 };
}

export function normalizeOptionalPhone(
  phone: string | null | undefined,
  countryHint: string | null | undefined,
): { ok: true; e164: string | null } | { ok: false; message: string } {
  const raw = phone?.trim();
  if (!raw) return { ok: true, e164: null };
  const result = normalizePhoneNumber(raw, countryHint);
  if (!result.ok) return result;
  return { ok: true, e164: result.e164 };
}
