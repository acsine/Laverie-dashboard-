import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { resolveCountryCode } from "@/lib/phone-country";

export const PHONE_INVALID_MESSAGE =
  "Numéro de téléphone invalide pour le pays sélectionné.";

export type PhoneNormalizeResult =
  | { ok: true; e164: string; international: string }
  | { ok: false; message: string };

function toCountry(hint: string | null | undefined): CountryCode {
  return resolveCountryCode(hint);
}

export function normalizePhoneNumber(
  raw: string,
  countryHint?: string | null,
): PhoneNormalizeResult {
  const input = raw.trim();
  if (!input) {
    return { ok: false, message: "Téléphone requis." };
  }
  const country = toCountry(countryHint);
  const parsed = parsePhoneNumberFromString(input, country);
  if (!parsed?.isValid()) {
    return { ok: false, message: PHONE_INVALID_MESSAGE };
  }
  return {
    ok: true,
    e164: parsed.format("E.164"),
    international: parsed.formatInternational(),
  };
}

export function isPhoneValid(raw: string, countryHint?: string | null): boolean {
  const input = raw.trim();
  if (!input) return false;
  return isValidPhoneNumber(input, toCountry(countryHint));
}

export function formatPhoneDisplay(raw: string, countryHint?: string | null): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const country = toCountry(countryHint);
  const parsed =
    parsePhoneNumberFromString(trimmed, country) ?? parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid()) return parsed.formatInternational();
  return trimmed;
}