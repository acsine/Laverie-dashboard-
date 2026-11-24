"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
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
  Select,
  toast,
} from "@/components/ui";
import { PhoneNumberField } from "@/components/phone-number-field";
import { listSearchEmptyCopy, matchesListSearch } from "@/lib/list-search";
import { normalizePhoneNumber } from "@/lib/phone";
import { PHONE_COUNTRY_OPTIONS } from "@/lib/phone-country";
import type { Column } from "@/components/ui";
import type { SiteAdminCandidate } from "@/server/sites/load-site-admin-candidates";
import { saveSiteAction } from "@/server/sites/actions";

export type SiteRow = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string | null;
  isActive: boolean;
};

const emptySite = {
  nom: "",
  adresse: "",
  ville: "",
  telephone: "",
  pays: "Cameroun",
  isActive: true,
};

type Props = {
  rows: SiteRow[];
  adminCandidates: SiteAdminCandidate[];
  editSiteId?: string | null;
};

export function SitesPage({ rows, adminCandidates, editSiteId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(emptySite);
  const [adminEmployeeId, setAdminEmployeeId] = useState("");
  const [search, setSearch] = useState("");

  const isEdit = editingId !== null;

  const paysOptions = useMemo(() => {
    const opts = PHONE_COUNTRY_OPTIONS.map((o) => ({ value: o.label, label: o.label }));
    if (form.pays && !opts.some((o) => o.value === form.pays)) {
      opts.unshift({ value: form.pays, label: form.pays });
    }
    return opts;
  }, [form.pays]);

  const adminOptions = [
  { value: "", label: "— Choisir un employé —" },
  ...adminCandidates.map((c) => ({ value: c.id, label: c.label })),
  ];

  function openCreate() {
    setEditingId(null);
    setForm(emptySite);
    setAdminEmployeeId("");
    setOpen(true);
  }

  function siteDetailHref(id: string) {
    return `/sites/${encodeURIComponent(id)}`;
  }

  function openEdit(row: SiteRow) {
    setEditingId(row.id);
    setForm({
      nom: row.nom,
      adresse: row.adresse,
      ville: row.ville,
      telephone: row.telephone ?? "",
      pays: row.pays,
      isActive: row.isActive,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!editSiteId) return;
    const row = rows.find((r) => r.id === editSiteId);
    if (!row) return;
    openEdit(row);
    router.replace("/sites");
  }, [editSiteId, rows, router]);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        matchesListSearch(search, [
          r.id,
          r.nom,
          r.ville,
          r.pays,
          r.adresse,
          r.telephone,
          r.isActive ? "actif" : "inactif",
        ]),
      ),
    [rows, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucun site");

  const columns: Column<SiteRow>[] = [
    {
      key: "nom",
      header: "Nom",
      render: (r) => (
        <Link href={siteDetailHref(r.id)} className="font-semibold text-primary hover:underline">
          {r.nom}
        </Link>
      ),
    },
    { key: "ville", header: "Ville", render: (r) => r.ville },
    {
      key: "st",
      header: "Statut",
      render: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Actif" : "Inactif"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <IconActionLink
            href={siteDetailHref(r.id)}
            icon={Eye}
            aria-label={`Détail ${r.nom}`}
          />
          <IconActionButton
            icon={Pencil}
            aria-label={`Modifier ${r.nom}`}
            onClick={() => openEdit(r)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Sites" }]} />
      <h1 className="text-2xl font-bold text-ink">Sites</h1>
      <Button type="button" onClick={openCreate}>
        Nouveau site
      </Button>
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Nom, ville, pays, adresse, téléphone, statut…"
        id="sites-search"
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
        onClose={() => setOpen(false)}
        title={isEdit ? "Modifier le site" : "Nouveau site"}
      >
        <form
          className="flex max-h-[min(70vh,32rem)] flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.telephone.trim()) {
              const tel = normalizePhoneNumber(form.telephone, form.pays);
              if (!tel.ok) {
                toast(tel.message, "danger");
                return;
              }
            }
            startTransition(async () => {
              const payload = isEdit
                ? { id: editingId, ...form, isActive: form.isActive }
                : { ...form, isActive: true, adminEmployeeId };
              const res = await saveSiteAction(payload);
              if (!res.ok) {
                toast(res.error.message, "danger");
                return;
              }
              toast(
                isEdit ? "Site mis à jour" : "Site créé — administrateur affecté",
                "success",
              );
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink">Agence</h3>
            {isEdit && <p className="font-mono text-xs text-muted">{editingId}</p>}
            <Input
              label="Nom"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
            />
            <Input
              label="Adresse"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            />
            <Input
              label="Ville"
              value={form.ville}
              onChange={(e) => setForm({ ...form, ville: e.target.value })}
            />
            <Select
              label="Pays"
              value={form.pays}
              onChange={(label) => setForm({ ...form, pays: label })}
              options={paysOptions}
            />
            <PhoneNumberField
              phone={form.telephone}
              country={form.pays}
              hideCountrySelect
              onPhoneChange={(telephone) => setForm({ ...form, telephone })}
              onCountryChange={() => {}}
            />
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
          </section>

          {!isEdit && (
            <section className="space-y-3 border-t border-line pt-3">
              <h3 className="text-sm font-bold text-ink">Administrateur du site</h3>
              <p className="text-xs text-muted">
                Choisissez un employé déjà créé dans{" "}
                <Link href="/employes" className="font-semibold text-primary underline-offset-2 hover:underline">
                  Employés
                </Link>{" "}
                (e-mail et mot de passe obligatoires). Il sera rattaché au nouveau site avec le rôle{" "}
                <strong>administrateur</strong>.
              </p>
              {adminCandidates.length === 0 ? (
                <p className="rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
                  Aucun gérant ou administrateur disponible. Créez d&apos;abord un employé avec e-mail et mot de passe.
                </p>
              ) : (
                <Select
                  label="Employé"
                  value={adminEmployeeId}
                  onChange={setAdminEmployeeId}
                  options={adminOptions}
                />
              )}
            </section>
          )}

          {isEdit && (
            <p className="text-xs text-muted">
              Pour changer l&apos;administrateur ou le personnel, utilisez la page <strong>Employés</strong>.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={!isEdit && adminCandidates.length === 0}
            >
              {isEdit ? "Enregistrer" : "Créer le site"}
            </Button>
          </div>
        </form>
      </Modal>
      {rows.length > 0 && (
        <p className="text-xs text-muted">Suppression : contactez le support si le site contient des données liées.</p>
      )}
    </div>
  );
}