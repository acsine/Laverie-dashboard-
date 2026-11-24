"use client";

import { Input, Select } from "@/components/ui";
import { PHONE_COUNTRY_OPTIONS, resolveCountryCode } from "@/lib/phone-country";
import type { CountryCode } from "libphonenumber-js";
import { getCountryCallingCode } from "libphonenumber-js";

type Props = {
  label?: string;
  phone: string;
  country: string;
  onPhoneChange: (value: string) => void;
  onCountryChange: (countryCode: CountryCode, countryLabel: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Masque le sélecteur si le pays est géré ailleurs (ex. champ Pays du site). */
  hideCountrySelect?: boolean;
};

export function PhoneNumberField({
  label = "Téléphone",
  phone,
  country,
  onPhoneChange,
  onCountryChange,
  required,
  disabled,
  hideCountrySelect,
}: Props) {
  const code = resolveCountryCode(country) as CountryCode;
  let callingCode = "";
  try {
    callingCode = getCountryCallingCode(code);
  } catch {
    callingCode = "";
  }

  return (
    <div className="space-y-2">
      {!hideCountrySelect && (
        <Select
          label="Pays du numéro"
          value={code}
          disabled={disabled}
          onChange={(iso) => {
            const opt = PHONE_COUNTRY_OPTIONS.find((o) => o.value === iso);
            onCountryChange(iso as CountryCode, opt?.label ?? iso);
          }}
          options={PHONE_COUNTRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      )}
      <Input
        label={label}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={callingCode ? `Ex. +${callingCode} …` : "Numéro avec indicatif ou national"}
      />
      <p className="text-xs text-muted">
        {hideCountrySelect
          ? `Validé pour le pays : ${country || "par défaut"}`
          : `Indicatif +${callingCode || "—"}`}
      </p>
    </div>
  );
}
