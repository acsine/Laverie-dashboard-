"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  DataTable,
  IconActionButton,
  Input,
  ListSearchInput,
  Modal,
  Select,
  toast,
} from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import type { Column } from "@/components/ui";
import {
  deleteVehicleAction,
  saveVehicleAction,
} from "@/server/clients/actions";
import { useConfirm } from "@/hooks/use-confirm";

export type ClientVehicleSnapshot = {
  id: string;
  marque: string;
  matricule: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
};

type VehicleTypeOption = { value: string; label: string };

type Props = {
  open: boolean;
  customerId: string;
  customerName: string;
  vehicles: ClientVehicleSnapshot[];
  vehicleTypeOptions: VehicleTypeOption[];
  siteId: string | null;
  canEdit: boolean;
  onClose: () => void;
};

type VehicleForm = { matricule: string; marque: string; vehicleTypeId: string };

const emptyVehicleForm = (defaultType: string): VehicleForm => ({
  matricule: "",
  marque: "",
  vehicleTypeId: defaultType,
});

export function ClientVehiclesModal({
  open,
  customerId,
  customerName,
  vehicles,
  vehicleTypeOptions,
  siteId,
  canEdit,
  onClose,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyVehicleForm(vehicleTypeOptions[0]?.value ?? ""));

  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setEditingId(null);
    }
  }, [open]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyVehicleForm(vehicleTypeOptions[0]?.value ?? ""));
    setFormOpen(true);
  }

  function openEdit(row: ClientVehicleSnapshot) {
    setEditingId(row.id);
    setForm({
      matricule: row.matricule,
      marque: row.marque,
      vehicleTypeId: row.vehicleTypeId,
    });
    setFormOpen(true);
  }

  function saveVehicle() {
    if (!form.matricule.trim() || !form.vehicleTypeId) {
      toast("Matricule et type de véhicule obligatoires", "danger");
      return;
    }
    startTransition(async () => {
      const res = await saveVehicleAction({
        id: editingId ?? undefined,
        customerId,
        matricule: form.matricule,
        marque: form.marque,
        vehicleTypeId: form.vehicleTypeId,
        lavSiteId: siteId ?? undefined,
      });
      if (!res.ok) {
        toast(res.error.message, "danger");
        return;
      }
      toast(editingId ? "Véhicule mis à jour" : "Véhicule ajouté", "success");
      setFormOpen(false);
      router.refresh();
    });
  }

  function removeVehicle(row: ClientVehicleSnapshot) {
    confirm(
      {
        title: "Supprimer le véhicule",
        description: `Supprimer ${row.matricule} ?`,
        confirmLabel: "Supprimer",
      },
      () => {
        setDeletingVehicleId(row.id);
        startTransition(async () => {
          try {
            const res = await deleteVehicleAction(row.id, customerId);
            if (!res.ok) {
              toast(res.error.message, "danger");
              return;
            }
            toast("Véhicule supprimé", "success");
            router.refresh();
          } finally {
            setDeletingVehicleId(null);
          }
        });
      },
    );
  }

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((r) =>
        matchesListSearch(search, [r.id, r.matricule, r.marque, r.vehicleTypeId, r.vehicleTypeName]),
      ),
    [vehicles, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucun véhicule");

  const columns: Column<ClientVehicleSnapshot>[] = [
    {
      key: "mat",
      header: "Matricule",
      className: "w-[22%]",
      render: (r) => <span className="font-medium break-all">{r.matricule}</span>,
    },
    {
      key: "brand",
      header: "Marque",
      className: "w-[28%]",
      render: (r) => r.marque || "—",
    },
    {
      key: "type",
      header: "Type",
      className: "w-[34%]",
      render: (r) => r.vehicleTypeName || "—",
    },
    ...(canEdit
      ? [
          {
            key: "act",
            header: "Actions",
            className: "w-[16%] text-right",
            render: (r: ClientVehicleSnapshot) => (
              <div className="flex justify-end gap-1">
                <IconActionButton
                  icon={Pencil}
                  size="sm"
                  aria-label="Modifier"
                  onClick={() => openEdit(r)}
                />
                <IconActionButton
                  icon={Trash2}
                  size="sm"
                  tone="danger"
                  aria-label="Supprimer"
                  loading={deletingVehicleId === r.id}
                  onClick={() => removeVehicle(r)}
                />
              </div>
            ),
          } as Column<ClientVehicleSnapshot>,
        ]
      : []),
  ];

  return (
  <>
    <Modal
      open={open}
      onClose={onClose}
      title={`Véhicules — ${customerName}`}
      className="w-[96vw] max-w-5xl sm:max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          {canEdit && (
            <Button type="button" variant="secondary" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un véhicule
            </Button>
          )}
        </div>
      }
    >
      {vehicleTypeOptions.length === 0 && canEdit && (
        <p className="mb-3 rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Créez d&apos;abord des types de véhicule dans le <strong>Catalogue</strong>.
        </p>
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Immatriculation, marque, type…"
        id="client-vehicles-search"
        className="mb-3"
      />
      <div className="min-h-[12rem]">
        <DataTable
          fluid
          columns={columns}
          rows={filteredVehicles}
          rowKey={(r) => r.id}
          emptyTitle={emptyCopy.emptyTitle}
          emptyDescription={emptyCopy.emptyDescription}
        />
      </div>
    </Modal>

    <Modal
      open={formOpen}
      onClose={() => setFormOpen(false)}
      title={editingId ? "Modifier le véhicule" : "Nouveau véhicule"}
      className="w-[96vw] max-w-lg sm:w-full"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
            Annuler
          </Button>
          <Button type="button" loading={pending} onClick={saveVehicle}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Marque"
          value={form.marque}
          onChange={(e) => setForm({ ...form, marque: e.target.value })}
        />
        <Input
          label="Matricule"
          value={form.matricule}
          onChange={(e) => setForm({ ...form, matricule: e.target.value })}
          required
        />
        <Select
          label="Type de véhicule"
          value={form.vehicleTypeId}
          onChange={(v) => setForm({ ...form, vehicleTypeId: v })}
          options={[{ value: "", label: "— Choisir —" }, ...vehicleTypeOptions]}
        />
      </div>
    </Modal>
    {confirmDialog}
  </>
  );
}