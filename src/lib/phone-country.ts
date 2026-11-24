import type { CountryCode } from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "CM";

/** Pays courants (libellés UI + code ISO pour libphonenumber). */
export const PHONE_COUNTRY_OPTIONS: { value: CountryCode; label: string }[] = [
  { value: "CM", label: "Cameroun" },
  { value: "SN", label: "Sénégal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "BJ", label: "Bénin" },
  { value: "BF", label: "Burkina Faso" },
  { value: "ML", label: "Mali" },
  { value: "NE", label: "Niger" },
  { value: "TG", label: "Togo" },
  { value: "GN", label: "Guinée" },
  { value: "GA", label: "Gabon" },
  { value: "CG", label: "Congo" },
  { value: "CD", label: "RD Congo" },
  { value: "MA", label: "Maroc" },
  { value: "TN", label: "Tunisie" },
  { value: "DZ", label: "Algérie" },
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "CA", label: "Canada" },
  { value: "US", label: "États-Unis" },
];

const LABEL_TO_CODE = new Map(
  PHONE_COUNTRY_OPTIONS.map((o) => [o.label.toLowerCase(), o.value]),
);

export function countryCodeToLabel(code: CountryCode): string {
  return PHONE_COUNTRY_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

/** Résout un pays (libellé, code ISO ou vide) vers un code libphonenumber. */
export function resolveCountryCode(input: string | null | undefined): CountryCode {
  const raw = input?.trim();
  if (!raw) return DEFAULT_PHONE_COUNTRY;
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase() as CountryCode;
  const byLabel = LABEL_TO_CODE.get(raw.toLowerCase());
  if (byLabel) return byLabel;
  const partial = PHONE_COUNTRY_OPTIONS.find((o) => o.label.toLowerCase().startsWith(raw.toLowerCase()));
  if (partial) return partial.value;
  return DEFAULT_PHONE_COUNTRY;
}

export function defaultCountryLabel(): string {
  return countryCodeToLabel(DEFAULT_PHONE_COUNTRY);
}