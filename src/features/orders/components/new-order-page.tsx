"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveCatalogPrice, type PricingRow } from "@/lib/catalogue-scope";
import { SiteScopePicker } from "@/components/site-scope-picker";
import { SiteFilterBanner } from "@/components/site-filter-banner";
import { Breadcrumbs, Button, Input, Select, toast } from "@/components/ui";
import { createOrderAction } from "@/server/orders/actions";

type VehicleOption = { value: string; label: string; vehicleTypeId?: string };
type CustomerOption = { value: string; label: string; vehicles: VehicleOption[] };

type Props = {
  customers: CustomerOption[];
  vehicleTypes: { value: string; label: string }[];
  services: { value: string; label: string }[];
  pricing: PricingRow[];
  washers: { value: string; label: string }[];
  siteLabel?: string | null;
  siteId: string | null;
  isPlatform: boolean;
  sites: { id: string; nom: string }[];
  defaultCustomerId?: string | null;
};

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Espèces" },
  { value: "mobileMoney", label: "Mobile Money" },
  { value: "card", label: "Carte bancaire" },
  { value: "bankTransfer", label: "Virement" },
];

export function NewOrderPage({
  customers,
  vehicleTypes,
  services,
  pricing,
  washers,
  siteLabel,
  siteId,
  isPlatform,
  sites,
  defaultCustomerId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState(vehicleTypes[0]?.value ?? "");
  const [vehicleId, setVehicleId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [washerId, setWasherId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.value === customerId),
    [customers, customerId],
  );

  useEffect(() => {
    if (!customers.length) return;
    const fromUrl =
      defaultCustomerId && customers.some((c) => c.value === defaultCustomerId)
        ? defaultCustomerId
        : "";
    setCustomerId(fromUrl || customers[0]?.value || "");
  }, [customers, defaultCustomerId]);

  useEffect(() => {
    const vehicles = selectedCustomer?.vehicles ?? [];
    const first = vehicles[0];
    if (first?.value) {
      setVehicleId(first.value);
      if (first.vehicleTypeId && vehicleTypes.some((t) => t.value === first.vehicleTypeId)) {
        setVehicleTypeId(first.vehicleTypeId);
      }
    } else {
      setVehicleId("");
    }
  }, [selectedCustomer, vehicleTypes]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const sid of serviceIds) {
      sum += resolveCatalogPrice(pricing, sid, vehicleTypeId, siteId);
    }
    return sum;
  }, [serviceIds, vehicleTypeId, pricing, siteId]);

  const discountNum = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const siteReady = !isPlatform || Boolean(siteId);

  if (!siteReady) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Commandes", href: "/commandes" }, { label: "Nouvelle" }]} />
        <h1 className="text-2xl font-bold text-ink">Nouvelle commande</h1>
        <SiteScopePicker sites={sites} currentSiteId={null} required className="max-w-md" />
        <p className="text-sm text-muted">
          En tant que super admin, choisissez d&apos;abord le site (clients, tarifs et employés du site).
        </p>
      </div>
    );
  }

  const vehicleOptions = [
    { value: "", label: "— Sans véhicule enregistré —" },
    ...(selectedCustomer?.vehicles ?? []),
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Commandes", href: "/commandes" }, { label: "Nouvelle" }]} />
      <h1 className="text-2xl font-bold text-ink">Nouvelle commande</h1>
      {isPlatform && (
        <SiteScopePicker sites={sites} currentSiteId={siteId} required className="max-w-md" />
      )}
      {siteLabel && <SiteFilterBanner label={siteLabel} />}

      {defaultCustomerId && selectedCustomer && (
        <p className="rounded-panel border border-line bg-primary-softer/40 px-4 py-2 text-sm text-ink">
          Commande pour le client : <strong>{selectedCustomer.label}</strong>
        </p>
      )}

      <Select
        label="Client"
        options={customers.length ? customers : [{ value: "", label: "Aucun client sur ce site" }]}
        value={customerId}
        onChange={setCustomerId}
      />
      <Select
        label="Véhicule du client"
        options={vehicleOptions}
        value={vehicleId}
        onChange={setVehicleId}
      />
      <Select label="Type véhicule" options={vehicleTypes} value={vehicleTypeId} onChange={setVehicleTypeId} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Services</p>
        <ul className="flex flex-col gap-2">
          {services.map((s) => (
            <li key={s.value}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.value)}
                  onChange={() => toggleService(s.value)}
                />
                {s.label}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <Select
        label="Laveur (optionnel)"
        options={[{ value: "", label: "— Plus tard —" }, ...washers]}
        value={washerId}
        onChange={setWasherId}
      />
      <Select label="Mode de paiement" options={PAYMENT_OPTIONS} value={paymentMethod} onChange={setPaymentMethod} />
      <Input
        label="Remise (FCFA)"
        type="number"
        min={0}
        value={discount}
        onChange={(e) => setDiscount(e.target.value)}
      />
      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="rounded-panel border border-line bg-primary-softer/40 px-4 py-3 text-sm">
        <p>
          Sous-total : <strong>{subtotal.toLocaleString("fr-FR")} FCFA</strong>
        </p>
        <p className="mt-1 font-semibold text-ink">
          Total à payer : {total.toLocaleString("fr-FR")} FCFA
        </p>
      </div>
      <Button
        type="button"
        loading={pending}
        disabled={!customerId || serviceIds.length === 0 || !vehicleTypeId}
        onClick={() =>
          startTransition(async () => {
            const res = await createOrderAction({
              lavSiteId: siteId ?? undefined,
              customerId,
              vehicleTypeId,
              vehicleId: vehicleId || undefined,
              serviceIds,
              totalAmount: subtotal,
              discount: discountNum,
              paymentMethod: paymentMethod as "cash" | "mobileMoney" | "card" | "bankTransfer",
              notes,
              assignedEmployeeId: washerId || undefined,
            });
            if (!res.ok) {
              toast(res.error.message, "danger");
              return;
            }
            toast("Commande créée — code retrait généré", "success");
            router.push(res.id ? `/commandes/${res.id}` : "/commandes");
            router.refresh();
          })
        }
      >
        Créer la commande
      </Button>
    </div>
  );
}