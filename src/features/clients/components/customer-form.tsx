"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { PhoneNumberField } from "@/components/phone-number-field";
import { Button, Input, Select } from "@/components/ui";
import { defaultCountryLabel } from "@/lib/phone-country";
import type { CustomerRowDto } from "@/server/clients/map-customer";

export type VehicleFormEntry = {
  id?: string;
  marque: string;
  matricule: string;
  vehicleTypeId: string;
};

export type CustomerFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  clientNumber: string;
  country: string;
  vehicles: VehicleFormEntry[];
};

type VehicleTypeOption = { value: string; label: string };

type Props = {
  id?: string;
  formId: string;
  initial?: CustomerRowDto | null;
  initialVehicles?: VehicleFormEntry[];
  vehicleTypeOptions: VehicleTypeOption[];
  onSubmit: (values: CustomerFormValues & { id?: string; createdAt?: string }) => void;
};

export function emptyCustomerForm(): CustomerFormValues {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    clientNumber: "",
    country: defaultCountryLabel(),
    vehicles: [{ marque: "", matricule: "", vehicleTypeId: "" }],
  };
}

export function customerToForm(
  customer: CustomerRowDto,
  vehicles: VehicleFormEntry[],
): CustomerFormValues {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    clientNumber: customer.clientNumber,
    country: customer.country?.trim() ? customer.country : defaultCountryLabel(),
    vehicles:
      vehicles.length > 0
        ? vehicles
        : [{ marque: customer.marque, matricule: customer.matricule, vehicleTypeId: "" }],
  };
}

export function CustomerForm({
  id,
  formId,
  initial,
  initialVehicles,
  vehicleTypeOptions,
  onSubmit,
}: Props) {
  const base = useMemo(() => {
    if (initial) return customerToForm(initial, initialVehicles ?? []);
    return emptyCustomerForm();
  }, [initial, initialVehicles]);

  const [form, setForm] = useState(base);

  function setVehicle(index: number, patch: Partial<VehicleFormEntry>) {
    setForm((f) => {
      const vehicles = [...f.vehicles];
      const cur = vehicles[index];
      if (!cur) return f;
      vehicles[index] = { ...cur, ...patch };
      return { ...f, vehicles };
    });
  }

  function addVehicle() {
    setForm((f) => ({
      ...f,
      vehicles: [...f.vehicles, { marque: "", matricule: "", vehicleTypeId: "" }],
    }));
  }

  function removeVehicle(index: number) {
    setForm((f) => {
      if (f.vehicles.length <= 1) return f;
      return { ...f, vehicles: f.vehicles.filter((_, i) => i !== index) };
    });
  }

  return (
    <form
      id={formId}
      className="flex max-h-[min(70vh,36rem)] flex-col gap-4 overflow-y-auto pr-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          id,
          createdAt: initial?.createdAt,
        });
      }}
    >
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Informations personnelles</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Prénom"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <Input
            label="Nom"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
        <PhoneNumberField
          phone={form.phone}
          country={form.country}
          onPhoneChange={(phone) => setForm({ ...form, phone })}
          onCountryChange={(_code, label) => setForm({ ...form, country: label })}
          required
        />
        <Input
          label="E-mail (optionnel)"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </section>

      <section className="space-y-3 border-t border-line pt-3">
        <h3 className="text-sm font-bold text-ink">Numéro client</h3>
        <Input
          label="Numéro client"
          value={form.clientNumber}
          onChange={(e) => setForm({ ...form, clientNumber: e.target.value })}
          placeholder={id ? undefined : "Généré automatiquement si vide"}
        />
      </section>

      <section className="space-y-3 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-ink">Véhicules</h3>
          <Button type="button" variant="secondary" onClick={addVehicle}>
            Ajouter un véhicule
          </Button>
        </div>
        {form.vehicles.map((v, index) => (
          <div
            key={v.id ?? `new-${index}`}
            className="space-y-2 rounded-panel border border-line bg-primary-softer/20 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Véhicule {index + 1}</p>
              {form.vehicles.length > 1 && (
                <button
                  type="button"
                  className="text-danger hover:opacity-80"
                  aria-label="Retirer le véhicule"
                  onClick={() => removeVehicle(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              label="Marque"
              value={v.marque}
              onChange={(e) => setVehicle(index, { marque: e.target.value })}
              required
            />
            <Input
              label="Matricule"
              value={v.matricule}
              onChange={(e) => setVehicle(index, { matricule: e.target.value })}
              required
            />
            <Select
              label="Type de véhicule"
              value={v.vehicleTypeId}
              onChange={(val) => setVehicle(index, { vehicleTypeId: val })}
              options={[
                { value: "", label: "— Choisir —" },
                ...vehicleTypeOptions,
              ]}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3 border-t border-line pt-3">
        <h3 className="text-sm font-bold text-ink">Adresse</h3>
        <Input
          label="Adresse (optionnel)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </section>
    </form>
  );
}