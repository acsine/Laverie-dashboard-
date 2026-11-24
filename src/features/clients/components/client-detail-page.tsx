"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import {
  Breadcrumbs,
  Badge,
  Button,
  DataTable,
  KpiCard,
  Modal,
  Select,
  Input,
  ListSearchInput,
  toast,
} from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import { normalizePhoneNumber } from "@/lib/phone";
import type { Column } from "@/components/ui";
import type { CustomerRowDto } from "@/server/clients/map-customer";
import { customerDisplayName } from "@/server/clients/map-customer";
import type { CustomerActivity } from "@/server/clients/get-customer-stats";
import {
  deleteCustomerAction,
  deleteVehicleAction,
  saveCustomerAction,
  saveVehicleAction,
} from "@/server/clients/actions";
import { CustomerForm, type VehicleFormEntry } from "./customer-form";
import { useConfirm } from "@/hooks/use-confirm";

export type VehicleRow = {
  id: string;
  matricule: string;
  marque: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
};

type VehicleTypeOption = { value: string; label: string };

type Props = {
  customer: CustomerRowDto;
  vehicles: VehicleRow[];
  activity: CustomerActivity;
  canEdit: boolean;
  listHref: string;
  siteId: string | null;
  vehicleTypeOptions: VehicleTypeOption[];
};

export function ClientDetailPage({
  customer,
  vehicles,
  activity,
  canEdit,
  listHref,
  siteId,
  vehicleTypeOptions,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleForm, setVehicleForm] = useState({
    matricule: "",
    marque: "",
    vehicleTypeId: "",
  });

  const name = customerDisplayName(customer);

  function openAddVehicle() {
    setEditingVehicle(null);
    setVehicleForm({ matricule: "", marque: "", vehicleTypeId: vehicleTypeOptions[0]?.value ?? "" });
    setVehicleOpen(true);
  }

  function openEditVehicle(row: VehicleRow) {
    setEditingVehicle(row);
    setVehicleForm({
      matricule: row.matricule,
      marque: row.marque,
      vehicleTypeId: row.vehicleTypeId,
    });
    setVehicleOpen(true);
  }

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((r) =>
        matchesListSearch(vehicleSearch, [r.id, r.matricule, r.marque, r.vehicleTypeId, r.vehicleTypeName]),
      ),
    [vehicles, vehicleSearch],
  );

  const vehiclesEmpty = listSearchEmptyCopy(vehicleSearch, "Aucun véhicule");

  const vehicleColumns: Column<VehicleRow>[] = [
    { key: "mat", header: "Immatriculation", render: (r) => r.matricule },
    { key: "brand", header: "Marque", render: (r) => r.marque || "—" },
    { key: "type", header: "Type", render: (r) => r.vehicleTypeName || "—" },
    ...(canEdit
      ? [
          {
            key: "act",
            header: "Actions",
            render: (r: VehicleRow) => (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-primary hover:underline text-sm"
                  onClick={() => openEditVehicle(r)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="text-danger hover:underline text-sm"
                  disabled={pending}
                  onClick={() => confirmDeleteVehicle(r)}
                >
                  Supprimer
                </button>
              </div>
            ),
          } as Column<VehicleRow>,
        ]
      : []),
  ];

  function confirmDeleteVehicle(row: VehicleRow) {
    confirm(
      {
        title: "Supprimer le véhicule",
        description: `Supprimer le véhicule ${row.matricule} ?`,
        confirmLabel: "Supprimer",
      },
      () => {
        startTransition(async () => {
          const res = await deleteVehicleAction(row.id, customer.id);
          if (!res.ok) {
            toast(res.error.message, "danger");
            return;
          }
          toast("Véhicule supprimé", "success");
          router.refresh();
        });
      },
    );
  }

  function confirmDeleteCustomer() {
    confirm(
      {
        title: "Supprimer le client",
        description: `Supprimer ${name} ?`,
        confirmLabel: "Supprimer",
      },
      () => {
        startTransition(async () => {
          const res = await deleteCustomerAction(customer.id);
          if (!res.ok) {
            toast(res.error.message, "danger");
            return;
          }
          toast("Client supprimé", "success");
          router.push(listHref);
          router.refresh();
        });
      },
    );
  }

  const initialVehicles: VehicleFormEntry[] = vehicles.map((v) => ({
    id: v.id,
    marque: v.marque,
    matricule: v.matricule,
    vehicleTypeId: v.vehicleTypeId,
  }));

  const newOrderHref = (() => {
    const params = new URLSearchParams();
    params.set("customer", customer.id);
    const scopeSite = siteId ?? customer.lavSiteId;
    if (scopeSite) params.set("site", scopeSite);
    return `/commandes/nouvelle?${params.toString()}`;
  })();

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: "Plateforme" }, { label: "Clients", href: listHref }, { label: name }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
            {customer.firstName.charAt(0) || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{name}</h1>
            <p className="text-sm text-muted">N° {customer.clientNumber || "—"}</p>
            <div className="mt-1">
              <Badge tone={customer.isActive ? "success" : "danger"}>
                {customer.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={listHref}>
            <Button type="button" variant="ghost">
              Retour
            </Button>
          </Link>
          <Link href={newOrderHref}>
            <Button type="button" variant="secondary">
              Nouvelle commande
            </Button>
          </Link>
          {canEdit && (
            <>
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Modifier
              </Button>
              <Button type="button" variant="danger" loading={pending} onClick={confirmDeleteCustomer}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      <dl className="grid gap-3 rounded-panel border border-line bg-primary-softer/20 p-4 text-sm sm:grid-cols-2">
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={customer.phone} />
        <InfoRow
          icon={<Mail className="h-4 w-4" />}
          label="E-mail"
          value={customer.email || "Non renseigné"}
        />
        <InfoRow
          icon={<MapPin className="h-4 w-4" />}
          label="Adresse"
          value={
            [customer.address, customer.country].filter(Boolean).join(" · ") || "Non renseignée"
          }
        />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Client depuis"
          value={new Date(customer.createdAt).toLocaleDateString("fr-FR")}
        />
      </dl>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink">Activité</h2>
        <div className="grid grid-cols-2 gap-2 md:max-w-md">
          <KpiCard label="Commandes" value={String(activity.ordersCount)} />
          <KpiCard label="Total dépensé" value={activity.totalSpentLabel} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Véhicules</h2>
          {canEdit && (
            <Button type="button" variant="secondary" onClick={openAddVehicle}>
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
        <ListSearchInput
          value={vehicleSearch}
          onChange={setVehicleSearch}
          placeholder="Immatriculation, marque, type…"
          id="client-detail-vehicles-search"
        />
        <DataTable
          columns={vehicleColumns}
          rows={filteredVehicles}
          rowKey={(r) => r.id}
          emptyTitle={vehiclesEmpty.emptyTitle}
          emptyDescription={vehiclesEmpty.emptyDescription}
        />
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le client"
        className="sm:max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="client-edit-form" loading={pending}>
              Mettre à jour
            </Button>
          </div>
        }
      >
        <CustomerForm
          formId="client-edit-form"
          id={customer.id}
          initial={customer}
          initialVehicles={initialVehicles}
          vehicleTypeOptions={vehicleTypeOptions}
          onSubmit={(values) => {
            const phoneCheck = normalizePhoneNumber(values.phone, values.country);
            if (!phoneCheck.ok) {
              toast(phoneCheck.message, "danger");
              return;
            }
            startTransition(async () => {
              const res = await saveCustomerAction({
                ...values,
                lavSiteId: siteId ?? customer.lavSiteId ?? undefined,
              });
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast("Client mis à jour", "success");
              setEditOpen(false);
              router.refresh();
            });
          }}
        />
      </Modal>

      <Modal
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title={editingVehicle ? "Modifier le véhicule" : "Nouveau véhicule"}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setVehicleOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              loading={pending}
              onClick={() => {
                if (!vehicleForm.matricule.trim() || !vehicleForm.vehicleTypeId) {
                  toast("Matricule et type de véhicule requis", "danger");
                  return;
                }
                startTransition(async () => {
                  const res = await saveVehicleAction({
                    id: editingVehicle?.id,
                    customerId: customer.id,
                    matricule: vehicleForm.matricule,
                    marque: vehicleForm.marque,
                    vehicleTypeId: vehicleForm.vehicleTypeId,
                    lavSiteId: siteId ?? customer.lavSiteId ?? undefined,
                  });
                  if (!res.ok) {
                    toast(res.error.message, "danger");
                    return;
                  }
                  toast(editingVehicle ? "Véhicule mis à jour" : "Véhicule ajouté", "success");
                  setVehicleOpen(false);
                  router.refresh();
                });
              }}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Marque"
            value={vehicleForm.marque}
            onChange={(e) => setVehicleForm({ ...vehicleForm, marque: e.target.value })}
          />
          <Input
            label="Matricule"
            value={vehicleForm.matricule}
            onChange={(e) => setVehicleForm({ ...vehicleForm, matricule: e.target.value })}
            required
          />
          <Select
            label="Type de véhicule"
            value={vehicleForm.vehicleTypeId}
            onChange={(v) => setVehicleForm({ ...vehicleForm, vehicleTypeId: v })}
            options={[{ value: "", label: "— Choisir —" }, ...vehicleTypeOptions]}
          />
        </div>
      </Modal>
      {confirmDialog}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
