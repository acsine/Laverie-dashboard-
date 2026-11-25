"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import {
  Breadcrumbs,
  Button,
  DataTable,
  IconActionButton,
  IconActionLink,
  Input,
  ListSearchInput,
  Modal,
  Select,
  Tabs,
  toast,
} from "@/components/ui";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import {
  catalogDetailHref,
  catalogKindFromTab,
  CATALOG_KINDS,
} from "@/lib/catalogue-routes";
import type { Column, TabItem } from "@/components/ui";
import type { CatalogRow } from "@/server/catalogue/map-catalogue";
import { catalogDeleteConfirmDescription } from "@/server/catalogue/delete-guards";
import { deleteCatalogItemAction, saveCatalogItemAction } from "@/server/catalogue/actions";
import type { EntityKey } from "@/server/cloud/entity-sync";
import { useConfirm } from "@/hooks/use-confirm";

type Props = {
  serviceCategories: CatalogRow[];
  services: CatalogRow[];
  vehicleCategories: CatalogRow[];
  vehicleTypes: CatalogRow[];
  pricing: CatalogRow[];
  canEdit: boolean;
  siteId: string | null;
  serviceOptions: { value: string; label: string }[];
  vehicleTypeOptions: { value: string; label: string }[];
  serviceCategoryOptions: { value: string; label: string }[];
  vehicleCategoryOptions: { value: string; label: string }[];
  siteLabel?: string | null;
  isPlatform?: boolean;
  sites?: { id: string; nom: string }[];
  editItemId?: string | null;
  initialTab?: string | null;
};

const emptyForm = () => ({
  name: "",
  description: "",
  serviceId: "",
  vehicleTypeId: "",
  price: "",
  categoryId: "",
  serviceCategoryId: "",
  isActive: true,
});

export function CataloguePage({
  serviceCategories,
  services,
  vehicleCategories,
  vehicleTypes,
  pricing,
  canEdit,
  siteId,
  serviceOptions,
  vehicleTypeOptions,
  serviceCategoryOptions,
  vehicleCategoryOptions,
  siteLabel,
  isPlatform = false,
  sites = [],
  editItemId,
  initialTab,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [tab, setTab] = useState(initialTab ?? "services");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formScope, setFormScope] = useState("universal");

  const tabItems: TabItem[] = useMemo(
    () => [
      { id: "svc-cat", label: "Cat. services" },
      { id: "services", label: "Services" },
      { id: "veh-cat", label: "Cat. véhicules" },
      { id: "veh-types", label: "Types véhicules" },
      { id: "pricing", label: "Tarifs" },
    ],
    [],
  );

  const kind = catalogKindFromTab(tab);
  const entityType = (): EntityKey => CATALOG_KINDS[kind].entityKey;

  const rowsForTab = (): CatalogRow[] => {
    if (tab === "svc-cat") return serviceCategories;
    if (tab === "veh-cat") return vehicleCategories;
    if (tab === "veh-types") return vehicleTypes;
    if (tab === "pricing") return pricing;
    return services;
  };

  const filtered = useMemo(() => {
    const list = rowsForTab();
    return list.filter((r) =>
      matchesListSearch(search, [
        r.id,
        r.name,
        r.description,
        r.extra,
        r.price,
        r.scopeLabel,
        `${r.price?.toLocaleString("fr-FR")} FCFA`,
      ]),
    );
  }, [tab, search, serviceCategories, services, vehicleCategories, vehicleTypes, pricing]);

  const emptyCopy = listSearchEmptyCopy(search, "Aucun élément");

  function detailHref(row: CatalogRow) {
    return catalogDetailHref(row.kind, row.id, siteId);
  }

  function defaultScope() {
    if (!isPlatform) return siteId ?? "";
    return siteId ?? "universal";
  }

  function canEditRow(row: CatalogRow) {
    if (!canEdit) return false;
    if (isPlatform) return true;
    if (!row.lavSiteId) return false;
    return !siteId || row.lavSiteId === siteId;
  }

  function resetForm() {
    setForm(emptyForm());
    setEditing(null);
    setFormScope(defaultScope());
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(row: CatalogRow) {
    setEditing(row);
    setFormScope(row.lavSiteId ? row.lavSiteId : "universal");
    setForm({
      name: row.name,
      description: row.description,
      serviceId: row.serviceId ?? "",
      vehicleTypeId: row.vehicleTypeId ?? "",
      price: row.price != null ? String(row.price) : "",
      categoryId: row.categoryId ?? "",
      serviceCategoryId: row.serviceCategoryId ?? "",
      isActive: row.isActive,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!editItemId) return;
    const all = [...serviceCategories, ...services, ...vehicleCategories, ...vehicleTypes, ...pricing];
    const row = all.find((r) => r.id === editItemId);
    if (!row) return;
    setTab(CATALOG_KINDS[row.kind].tabId);
    openEdit(row);
    const base = siteId ? `/catalogue?site=${encodeURIComponent(siteId)}` : "/catalogue";
    router.replace(base);
  }, [editItemId, serviceCategories, services, vehicleCategories, vehicleTypes, pricing, router, siteId]);

  function confirmDelete(row: CatalogRow) {
    confirm(
      {
        title: "Supprimer",
        description: catalogDeleteConfirmDescription(row.kind, row.name),
        confirmLabel: "Supprimer",
      },
      () => {
        setDeletingId(row.id);
        startTransition(async () => {
          try {
            const res = await deleteCatalogItemAction(CATALOG_KINDS[row.kind].entityKey, row.id);
            if (!res.ok) {
              toast(res.error.message, "danger");
              return;
            }
            toast("Élément supprimé", "success");
            router.refresh();
          } finally {
            setDeletingId(null);
          }
        });
      },
    );
  }

  const columns: Column<CatalogRow>[] = [
    {
      key: "name",
      header: tab === "pricing" ? "Combinaison" : "Nom",
      render: (r) => (
        <Link href={detailHref(r)} className="font-semibold text-primary hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "extra",
      header: "Détail",
      render: (r) => r.extra ?? "—",
    },
    {
      key: "scope",
      header: "Portée",
      className: "hidden md:table-cell",
      render: (r) => r.scopeLabel ?? (r.lavSiteId ? r.lavSiteId : "Universel"),
    },
    {
      key: "active",
      header: "Statut",
      className: "hidden sm:table-cell",
      render: (r) => (r.isActive ? "Actif" : "Inactif"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-nowrap items-center gap-0.5">
          <IconActionLink
            href={detailHref(r)}
            icon={Eye}
            title="Détail & KPI"
            aria-label={`Détail ${r.name}`}
          />
          {canEditRow(r) && (
            <>
              <IconActionButton
                icon={Pencil}
                title="Modifier"
                aria-label={`Modifier ${r.name}`}
                onClick={() => openEdit(r)}
              />
              <IconActionButton
                icon={Trash2}
                title="Archiver"
                tone="danger"
                aria-label={`Archiver ${r.name}`}
                loading={deletingId === r.id}
                onClick={() => confirmDelete(r)}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  const isEdit = editing !== null;
  const isPricing = tab === "pricing";

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Catalogue" }]} />
      <h1 className="text-2xl font-bold text-ink">Catalogue</h1>
      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId}
        siteLabel={siteLabel}
        showPicker={false}
      />
      {canEdit && (
        <p className="text-sm text-muted">
          Chaque élément peut être <strong className="text-ink">universel</strong> (tous les sites) ou
          réservé à <strong className="text-ink">une agence</strong>. Le filtre en haut permet de
          prévisualiser le catalogue d&apos;un site (universel + spécifique).
        </p>
      )}
      <Tabs items={tabItems} value={tab} onChange={setTab} />
      {canEdit && (
        <Button type="button" onClick={openCreate}>
          Ajouter
        </Button>
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Nom, détail, prix…"
        id="catalogue-search"
      />
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        emptyTitle={emptyCopy.emptyTitle}
        emptyDescription={emptyCopy.emptyDescription}
      />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title={isEdit ? "Modifier l'élément" : "Nouvel élément"}
        className="sm:max-w-lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" form="catalog-form" loading={pending}>
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        }
      >
        <form
          id="catalog-form"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isPlatform && !siteId) {
              toast("Site agence manquant", "danger");
              return;
            }
            if (isPlatform && formScope !== "universal" && !formScope) {
              toast("Choisissez une portée (universel ou site)", "danger");
              return;
            }
            startTransition(async () => {
              const res = await saveCatalogItemAction({
                id: editing?.id,
                createdAt: editing?.createdAt,
                entityType: entityType(),
                name: form.name,
                description: form.description,
                categoryId: form.categoryId || undefined,
                serviceCategoryId: form.serviceCategoryId || undefined,
                serviceId: form.serviceId || undefined,
                vehicleTypeId: form.vehicleTypeId || undefined,
                price: form.price ? Number(form.price) : undefined,
                isActive: form.isActive,
                lavSiteId: isPlatform ? formScope : siteId ?? undefined,
              });
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast(isEdit ? "Mis à jour" : "Créé", "success");
              setOpen(false);
              resetForm();
              router.refresh();
            });
          }}
        >
          {isPlatform ? (
            <Select
              label="Portée"
              value={formScope}
              onChange={setFormScope}
              options={[
                { value: "universal", label: "Universel (tous les sites)" },
                ...sites.map((s) => ({ value: s.id, label: s.nom })),
              ]}
            />
          ) : (
            <p className="rounded-panel border border-line bg-primary-softer/30 px-3 py-2 text-sm text-ink">
              Portée : <strong>{siteLabel ?? siteId ?? "Agence"}</strong>
            </p>
          )}
          {!isPricing && (
            <>
              <Input
                label="Nom"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </>
          )}
          {tab === "services" && (
            <Select
              label="Catégorie de service"
              value={form.serviceCategoryId}
              onChange={(v) => setForm({ ...form, serviceCategoryId: v })}
              options={[
                { value: "", label: "—" },
                ...serviceCategoryOptions,
              ]}
            />
          )}
          {tab === "veh-types" && (
            <Select
              label="Catégorie véhicule"
              value={form.categoryId}
              onChange={(v) => setForm({ ...form, categoryId: v })}
              options={[
                { value: "", label: "—" },
                ...vehicleCategoryOptions,
              ]}
            />
          )}
          {isPricing && (
            <>
              <Select
                label="Service"
                value={form.serviceId}
                onChange={(v) => setForm({ ...form, serviceId: v })}
                options={serviceOptions}
              />
              <Select
                label="Type véhicule"
                value={form.vehicleTypeId}
                onChange={(v) => setForm({ ...form, vehicleTypeId: v })}
                options={vehicleTypeOptions}
              />
              <Input
                label="Prix (FCFA)"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <Input
                label="Libellé (optionnel)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </>
          )}
          {isEdit && (
            <Select
              label="Statut"
              value={form.isActive ? "active" : "inactive"}
              onChange={(v) => setForm({ ...form, isActive: v === "active" })}
              options={[
                { value: "active", label: "Actif" },
                { value: "inactive", label: "Inactif" },
              ]}
            />
          )}
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
}