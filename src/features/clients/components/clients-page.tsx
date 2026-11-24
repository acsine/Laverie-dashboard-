"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, Eye, Pencil, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import {
  Breadcrumbs,
  Badge,
  Button,
  DataTable,
  IconActionButton,
  IconActionLink,
  Input,
  ListSearchInput,
  Modal,
  toast,
} from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import { normalizePhoneNumber } from "@/lib/phone";
import type { Column } from "@/components/ui";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import { useConfirm } from "@/hooks/use-confirm";
import type { CustomerRowDto } from "@/server/clients/map-customer";
import {
  deleteCustomerAction,
  saveCustomerAction,
} from "@/server/clients/actions";
import { CustomerForm, type CustomerFormValues } from "./customer-form";
import {
  ClientVehiclesModal,
  type ClientVehicleSnapshot,
} from "./client-vehicles-modal";

export type ClientListRow = CustomerRowDto & {
  name: string;
  vehicleCount: number;
};

type VehicleFormEntry = {
  id?: string;
  marque: string;
  matricule: string;
  vehicleTypeId: string;
};

type VehicleTypeOption = { value: string; label: string };

type Props = {
  rows: ClientListRow[];
  canEdit: boolean;
  siteLabel?: string | null;
  siteId?: string | null;
  vehicleTypeOptions: VehicleTypeOption[];
  vehiclesByCustomerId: Record<string, ClientVehicleSnapshot[]>;
  editCustomerId?: string | null;
  isPlatform?: boolean;
  sites?: { id: string; nom: string }[];
};

export function ClientsPage({
  rows,
  canEdit,
  siteLabel,
  siteId,
  vehicleTypeOptions,
  vehiclesByCustomerId,
  editCustomerId,
  isPlatform = false,
  sites = [],
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientListRow | null>(null);
  const [vehiclesFor, setVehiclesFor] = useState<ClientListRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        matchesListSearch(search, [
          r.id,
          r.name,
          r.phone,
          r.email,
          r.clientNumber,
          r.address,
          String(r.vehicleCount),
        ]),
      ),
    [rows, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucun client");

  function clientDetailHref(id: string) {
    return siteId
      ? `/clients/${encodeURIComponent(id)}?site=${encodeURIComponent(siteId)}`
      : `/clients/${encodeURIComponent(id)}`;
  }

  function newOrderHref(row: ClientListRow) {
    const params = new URLSearchParams();
    params.set("customer", row.id);
    const scopeSite = siteId ?? row.lavSiteId;
    if (scopeSite) params.set("site", scopeSite);
    return `/commandes/nouvelle?${params.toString()}`;
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: ClientListRow) {
    setEditing(row);
    setFormOpen(true);
  }

  function openVehicles(row: ClientListRow) {
    setVehiclesFor(row);
  }

  useEffect(() => {
    if (!editCustomerId) return;
    const row = rows.find((r) => r.id === editCustomerId);
    if (!row) return;
    openEdit(row);
    router.replace(siteId ? `/clients?site=${encodeURIComponent(siteId)}` : "/clients");
  }, [editCustomerId, rows, router, siteId]);

  function submitForm(values: CustomerFormValues & { id?: string; createdAt?: string }) {
    const phoneCheck = normalizePhoneNumber(values.phone, values.country);
    if (!phoneCheck.ok) {
      toast(phoneCheck.message, "danger");
      return;
    }
    for (const v of values.vehicles) {
      if (!v.marque.trim() || !v.matricule.trim() || !v.vehicleTypeId) {
        toast("Remplissez marque, matricule et type pour chaque véhicule.", "danger");
        return;
      }
    }
    startTransition(async () => {
      const res = await saveCustomerAction({
        ...values,
        lavSiteId: siteId ?? editing?.lavSiteId ?? undefined,
      });
      if (!res.ok) {
        toast(res.error.message, "danger");
        return;
      }
      toast(values.id ? "Client mis à jour" : "Client créé", "success");
      setFormOpen(false);
      setEditing(null);
      if (res.id && !values.id) {
        router.push(clientDetailHref(res.id));
      } else {
        router.refresh();
      }
    });
  }

  function confirmDelete(row: ClientListRow) {
    confirm(
      {
        title: "Supprimer le client",
        description: `Supprimer ${row.name} ?`,
        confirmLabel: "Supprimer",
      },
      () => {
        setDeletingId(row.id);
        startTransition(async () => {
          try {
            const res = await deleteCustomerAction(row.id);
            if (!res.ok) {
              toast(res.error.message, "danger");
              return;
            }
            toast("Client supprimé", "success");
            router.refresh();
          } finally {
            setDeletingId(null);
          }
        });
      },
    );
  }

  function vehiclesToFormEntries(id: string): VehicleFormEntry[] | undefined {
    const list = vehiclesByCustomerId[id];
    if (!list?.length) return undefined;
    return list.map((v) => ({
      id: v.id,
      marque: v.marque,
      matricule: v.matricule,
      vehicleTypeId: v.vehicleTypeId,
    }));
  }

  const columns: Column<ClientListRow>[] = [
    {
      key: "name",
      header: "Client",
      render: (r) => (
        <Link href={clientDetailHref(r.id)} className="font-semibold text-primary hover:underline">
          {r.name}
        </Link>
      ),
    },
    { key: "phone", header: "Téléphone", render: (r) => r.phone },
    { key: "num", header: "N° client", render: (r) => r.clientNumber || "—" },
    {
      key: "veh",
      header: "Véhicules",
      render: (r) => (
        <button
          type="button"
          title="Gérer les véhicules"
          className="inline-flex items-center gap-1 rounded-control border border-line bg-primary-softer/50 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
          onClick={() => openVehicles(r)}
        >
          <Car className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{r.vehicleCount}</span>
          <span className="hidden md:inline">
            {r.vehicleCount > 1 ? " véhicules" : " véhicule"}
          </span>
        </button>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      className: "hidden lg:table-cell",
      render: (r) => r.email || "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-nowrap items-center gap-0.5" role="group" aria-label={`Actions pour ${r.name}`}>
          <IconActionLink
            href={clientDetailHref(r.id)}
            icon={Eye}
            title="Voir la fiche"
            aria-label={`Détail ${r.name}`}
          />
          {canEdit && (
            <>
              <IconActionButton
                icon={Pencil}
                title="Modifier le client"
                aria-label={`Modifier ${r.name}`}
                onClick={() => openEdit(r)}
              />
              <IconActionButton
                icon={Car}
                title="Gérer les véhicules"
                aria-label={`Véhicules de ${r.name}`}
                onClick={() => openVehicles(r)}
              />
              <IconActionLink
                href={newOrderHref(r)}
                icon={ShoppingCart}
                title="Nouvelle commande"
                aria-label={`Commande pour ${r.name}`}
              />
              <IconActionButton
                icon={Trash2}
                tone="danger"
                title="Supprimer le client"
                aria-label={`Supprimer ${r.name}`}
                loading={deletingId === r.id}
                onClick={() => confirmDelete(r)}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Clients" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clients</h1>
          <p className="text-sm text-muted">
            Les clients sont communs à toutes les agences (pas de rattachement site obligatoire).
          </p>
        </div>
        {canEdit && (
          <Button type="button" onClick={openCreate}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Nouveau client
          </Button>
        )}
      </div>
      {siteLabel && (
        <SiteGestionScope
          isPlatform={isPlatform}
          sites={sites}
          siteId={siteId ?? null}
          siteLabel={siteLabel}
          showPicker={false}
        />
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Nom, téléphone, e-mail, n° client, adresse…"
        id="clients-search"
      />
      {canEdit && (
        <p className="text-xs text-muted">
          <Badge tone="neutral">Créer</Badge> bouton en haut ·{" "}
          <Badge tone="neutral">Modifier / Supprimer</Badge> par ligne ·{" "}
          <Badge tone="neutral">Véhicules</Badge> pour ajouter ou retirer des voitures
        </p>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        emptyTitle={emptyCopy.emptyTitle}
        emptyDescription={emptyCopy.emptyDescription}
      />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier le client" : "Nouveau client"}
        className="sm:max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" form="customer-form" loading={pending}>
              {editing ? "Mettre à jour" : "Enregistrer le client"}
            </Button>
          </div>
        }
      >
        <CustomerForm
          key={editing?.id ?? "new"}
          formId="customer-form"
          id={editing?.id}
          initial={editing}
          initialVehicles={editing ? vehiclesToFormEntries(editing.id) : undefined}
          vehicleTypeOptions={vehicleTypeOptions}
          onSubmit={submitForm}
        />
      </Modal>

      {vehiclesFor && (
        <ClientVehiclesModal
          open={Boolean(vehiclesFor)}
          customerId={vehiclesFor.id}
          customerName={vehiclesFor.name}
          vehicles={vehiclesByCustomerId[vehiclesFor.id] ?? []}
          vehicleTypeOptions={vehicleTypeOptions}
          siteId={siteId ?? null}
          canEdit={canEdit}
          onClose={() => setVehiclesFor(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}