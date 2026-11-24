"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
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
import { defaultCountryLabel } from "@/lib/phone-country";
import type { Column } from "@/components/ui";
import { useConfirm } from "@/hooks/use-confirm";
import { SiteGestionScope } from "@/components/site-gestion-scope";
import { DEFAULT_TENANT_PASSWORD } from "@/lib/default-tenant-password";
import {
  commissionRulesFromFormRows,
  commissionRowsFromRules,
  type CommissionFormRow,
  type VehicleCommissionRule,
} from "@/lib/employee-commission";
import { saveDefaultCommissionPercentAction } from "@/server/employees/commission-settings";
import {
  deleteEmployeeAction,
  resetEmployeePasswordAction,
  saveEmployeeAction,
} from "@/server/employees/actions";
import {
  CONTRACT_LABELS,
  ROLE_LABELS,
  contractLabel,
  roleLabel,
  roleNeedsLogin,
} from "./employee-labels";

export type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  contractType: string;
  isActive: boolean;
  hireDate: string;
  monthlySalary: number | null;
  ratePerVehicleType: Record<string, VehicleCommissionRule> | null;
  createdAt: string;
  lavSiteId: string | null;
};

type VehicleTypeOption = { id: string; name: string };

type Props = {
  rows: EmployeeRow[];
  canEdit: boolean;
  isPlatform: boolean;
  siteId: string | null;
  siteLabel?: string | null;
  siteOptions: { value: string; label: string }[];
  editEmployeeId?: string | null;
  vehicleTypes: VehicleTypeOption[];
  sites: { id: string; nom: string }[];
  defaultCommissionPercent: number | null;
  sitePaysById?: Record<string, string>;
};

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "washer",
  password: "",
  confirmPassword: "",
  contractType: "perVehicle" as "monthly" | "perVehicle",
  monthlySalary: "",
  hireDate: new Date().toISOString().slice(0, 10),
  isActive: true,
});

export function EmployeesPage({
  rows,
  canEdit,
  isPlatform,
  siteId,
  siteLabel,
  siteOptions,
  editEmployeeId,
  vehicleTypes,
  sites,
  defaultCommissionPercent,
  sitePaysById = {},
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formSiteId, setFormSiteId] = useState("");
  const [commissions, setCommissions] = useState<CommissionFormRow[]>([]);
  const [useGlobalCommission, setUseGlobalCommission] = useState(false);
  const [globalPercentDraft, setGlobalPercentDraft] = useState(
    defaultCommissionPercent != null ? String(defaultCommissionPercent) : "",
  );
  const [savingGlobalPercent, startSaveGlobalPercent] = useTransition();

  const needsAuth = roleNeedsLogin(form.role);
  const isEdit = editing !== null;
  const showSiteSelect = isPlatform || (!siteId && siteOptions.length > 0);

  const employeePhoneCountry = useMemo(() => {
    const target =
      (showSiteSelect ? formSiteId.trim() : "") ||
      siteId ||
      editing?.lavSiteId ||
      formSiteId.trim();
    if (target && sitePaysById[target]) return sitePaysById[target];
    return defaultCountryLabel();
  }, [showSiteSelect, formSiteId, siteId, editing?.lavSiteId, sitePaysById]);

  const usedVehicleIds = useMemo(
    () => new Set(commissions.map((c) => c.vehicleTypeId).filter(Boolean)),
    [commissions],
  );

  function resetForm() {
    setForm(emptyForm());
    setFormSiteId(siteId ?? "");
    setCommissions([]);
    setUseGlobalCommission(false);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function employeeDetailHref(id: string) {
    return siteId
      ? `/employes/${encodeURIComponent(id)}?site=${encodeURIComponent(siteId)}`
      : `/employes/${encodeURIComponent(id)}`;
  }

  function openEdit(row: EmployeeRow) {
    setEditing(row);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      role: row.role,
      password: "",
      confirmPassword: "",
      contractType: row.contractType as "monthly" | "perVehicle",
      monthlySalary:
        row.monthlySalary != null && row.monthlySalary > 0 ? String(row.monthlySalary) : "",
      hireDate: row.hireDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      isActive: row.isActive,
    });
    const rates = row.ratePerVehicleType ?? {};
    const rows = commissionRowsFromRules(rates);
    setCommissions(rows);
    setUseGlobalCommission(rows.length === 0 && defaultCommissionPercent != null);
    setFormSiteId(row.lavSiteId ?? siteId ?? "");
    setFormOpen(true);
  }

  useEffect(() => {
    if (!editEmployeeId) return;
    const row = rows.find((r) => r.id === editEmployeeId);
    if (!row) return;
    openEdit(row);
    router.replace(siteId ? `/employes?site=${encodeURIComponent(siteId)}` : "/employes");
  }, [editEmployeeId, rows, router, siteId]);

  function confirmDelete(row: EmployeeRow) {
    confirm(
      {
        title: "Archiver l'employé",
        description: `Archiver ${row.firstName} ${row.lastName} ?\n\nSuppression logique : le compte disparaît de l’app ; dans Supabase, vérifiez deleted_at et is_active.`,
        confirmLabel: "Archiver",
      },
      () => {
        setDeletingId(row.id);
        startTransition(async () => {
          try {
            const res = await deleteEmployeeAction(row.id);
            if (!res.ok) {
              toast(res.error.message, "danger");
              return;
            }
            toast("Employé archivé (suppression logique)", "success");
            router.refresh();
          } finally {
            setDeletingId(null);
          }
        });
      },
    );
  }

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        matchesListSearch(search, [
          r.id,
          r.firstName,
          r.lastName,
          `${r.firstName} ${r.lastName}`,
          r.email,
          r.phone,
          r.role,
          roleLabel(r.role),
          r.contractType,
          contractLabel(r.contractType),
          r.isActive ? "actif" : "inactif",
        ]),
      ),
    [rows, search],
  );

  const emptyCopy = listSearchEmptyCopy(search, "Aucun employé");

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "Nom",
      render: (r) => (
        <Link
          href={employeeDetailHref(r.id)}
          className="font-medium text-primary hover:underline"
        >
          {r.firstName} {r.lastName}
        </Link>
      ),
    },
    { key: "phone", header: "Téléphone", render: (r) => r.phone || "—" },
    { key: "email", header: "E-mail", render: (r) => r.email || "—" },
    {
      key: "role",
      header: "Rôle",
      render: (r) => <Badge tone="neutral">{roleLabel(r.role)}</Badge>,
    },
    {
      key: "contract",
      header: "Contrat",
      render: (r) => contractLabel(r.contractType),
    },
    {
      key: "active",
      header: "Actif",
      render: (r) => <Badge tone={r.isActive ? "success" : "danger"}>{r.isActive ? "Oui" : "Non"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <IconActionLink
            href={employeeDetailHref(r.id)}
            icon={Eye}
            tone="neutral"
            aria-label="Détails"
          />
          {canEdit && (
            <>
              <IconActionButton
                icon={Pencil}
                aria-label="Modifier"
                onClick={() => openEdit(r)}
              />
              <IconActionButton
                icon={Trash2}
                tone="danger"
                aria-label="Supprimer"
                loading={deletingId === r.id}
                onClick={() => confirmDelete(r)}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  function addCommissionRow() {
    const next = vehicleTypes.find((v) => !usedVehicleIds.has(v.id));
    if (!next) {
      toast("Tous les types de véhicule sont déjà listés", "info");
      return;
    }
    setCommissions((prev) => [...prev, { vehicleTypeId: next.id, mode: "fixed", amount: "" }]);
  }

  function confirmResetPassword(row: EmployeeRow) {
    confirm(
      {
        title: "Réinitialiser le mot de passe",
        description: `Réinitialiser le mot de passe de ${row.firstName} ${row.lastName} à « ${DEFAULT_TENANT_PASSWORD} » ?`,
        confirmLabel: "Réinitialiser",
      },
      () => {
    setResettingId(row.id);
    startTransition(async () => {
      try {
        const res = await resetEmployeePasswordAction(row.id);
        if (!res.ok) {
          toast(res.error.message, "danger");
          return;
        }
        toast(`Mot de passe réinitialisé : ${DEFAULT_TENANT_PASSWORD}`, "success");
        router.refresh();
      } finally {
        setResettingId(null);
      }
    });
      },
    );
  }

  function onResetPasswordInForm() {
    if (!editing) return;
    confirmResetPassword(editing);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const targetSiteId = showSiteSelect
      ? formSiteId.trim()
      : siteId ?? editing?.lavSiteId ?? formSiteId.trim();
    if (!targetSiteId) {
      toast("Choisissez le site de rattachement de l'employé", "danger");
      return;
    }
    const phoneCountry = sitePaysById[targetSiteId] ?? employeePhoneCountry;
    const phoneCheck = normalizePhoneNumber(form.phone, phoneCountry);
    if (!phoneCheck.ok) {
      toast(phoneCheck.message, "danger");
      return;
    }
    if (!isPlatform) {
      if (needsAuth && !isEdit && form.password !== form.confirmPassword) {
        toast("Les mots de passe ne correspondent pas", "danger");
        return;
      }
      if (needsAuth && isEdit && form.password && form.password !== form.confirmPassword) {
        toast("Les mots de passe ne correspondent pas", "danger");
        return;
      }
    }

    let ratePerVehicleType: Record<string, VehicleCommissionRule> | undefined;
    if (form.contractType === "perVehicle") {
      if (useGlobalCommission) {
        ratePerVehicleType = undefined;
      } else {
        ratePerVehicleType = commissionRulesFromFormRows(commissions);
        if (!Object.keys(ratePerVehicleType).length && !defaultCommissionPercent) {
          toast("Ajoutez une commission ou configurez le pourcentage global.", "danger");
          return;
        }
      }
    }

    startTransition(async () => {
      const res = await saveEmployeeAction({
        id: editing?.id,
        createdAt: editing?.createdAt,
        ...form,
        email: form.email || undefined,
        monthlySalary: form.contractType === "monthly" ? Number(form.monthlySalary) : undefined,
        ratePerVehicleType:
          form.contractType === "perVehicle"
            ? useGlobalCommission
              ? {}
              : ratePerVehicleType
            : undefined,
        lavSiteId: targetSiteId,
        phoneCountry,
        isActive: form.isActive,
        password: isPlatform ? undefined : form.password || undefined,
      });
      if (!res.ok) {
        toast(res.error.message, "danger");
        return;
      }
      toast(isEdit ? "Employé mis à jour" : "Employé créé", "success");
      setFormOpen(false);
      resetForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Plateforme" }, { label: "Employés" }]} />
      <h1 className="text-2xl font-bold text-ink">Employés</h1>
      <SiteGestionScope
        isPlatform={isPlatform}
        sites={sites}
        siteId={siteId}
        siteLabel={siteLabel}
        showPicker={false}
      />
      {canEdit && (
        <section className="rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-bold text-ink">Commission globale (contrat par véhicule)</h2>
          <p className="mt-1 text-xs text-muted">
            S&apos;applique à tous les employés qui utilisent le pourcentage global (sans grille
            personnalisée).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1 max-w-xs">
              <Input
                label="Pourcentage (%)"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={globalPercentDraft}
                onChange={(e) => setGlobalPercentDraft(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={savingGlobalPercent}
              onClick={() => {
                const percent = Number(globalPercentDraft);
                if (!(percent >= 0) || percent > 100) {
                  toast("Pourcentage entre 0 et 100.", "danger");
                  return;
                }
                startSaveGlobalPercent(async () => {
                  const res = await saveDefaultCommissionPercentAction({ percent });
                  if (!res.ok) {
                    toast(res.error.message, "danger");
                    return;
                  }
                  toast("Commission globale enregistrée", "success");
                  router.refresh();
                });
              }}
            >
              Enregistrer
            </Button>
          </div>
        </section>
      )}
      {canEdit && (
        <Button type="button" onClick={openCreate}>
          Nouvel employé
        </Button>
      )}
      <ListSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Nom, e-mail, téléphone, rôle, contrat…"
        id="employees-search"
      />
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
          resetForm();
        }}
        title={isEdit ? "Modifier l'employé" : "Nouvel employé"}
        className="sm:max-w-2xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" form="employee-form" loading={pending}>
              {isEdit ? "Enregistrer" : "Créer l'employé"}
            </Button>
          </div>
        }
      >
        <form id="employee-form" onSubmit={onSave} className="flex flex-col gap-4">
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
              country={employeePhoneCountry}
              hideCountrySelect
              onPhoneChange={(phone) => setForm({ ...form, phone })}
              onCountryChange={() => {}}
              required
            />
            <Input
              label={
                needsAuth ? "E-mail (requis pour admin / gérant)" : "E-mail (optionnel)"
              }
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required={needsAuth}
            />
            {needsAuth && isPlatform && (
              <div className="rounded-panel border border-line bg-primary-softer/40 p-3 text-sm text-ink">
                {isEdit ? (
                  <>
                    <p className="font-semibold">Mot de passe (super admin)</p>
                    <p className="mt-1 text-muted">
                      Vous ne pouvez pas définir un mot de passe personnalisé. Utilisez la
                      réinitialisation au mot de passe standard.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      loading={resettingId === editing?.id}
                      onClick={onResetPasswordInForm}
                    >
                      Réinitialiser à {DEFAULT_TENANT_PASSWORD}
                    </Button>
                  </>
                ) : (
                  <p>
                    Mot de passe initial fixe : <strong>{DEFAULT_TENANT_PASSWORD}</strong> (l&apos;employé
                    pourra le changer après connexion).
                  </p>
                )}
              </div>
            )}
            {needsAuth && !isPlatform && (
              <>
                <p className="text-sm font-semibold text-primary">
                  {isEdit ? "Nouveau mot de passe (optionnel)" : "Créer un mot de passe"}
                </p>
                <Input
                  label="Mot de passe"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!isEdit}
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required={!isEdit && Boolean(form.password)}
                />
              </>
            )}
          </section>

          <section className="space-y-3 border-t border-line pt-3">
            <h3 className="text-sm font-bold text-ink">Contrat &amp; rôle</h3>
            {showSiteSelect ? (
              <Select
                label="Site d'affectation"
                value={formSiteId}
                onChange={setFormSiteId}
                options={[
                  { value: "", label: "— Sélectionnez un site —" },
                  ...siteOptions,
                ]}
              />
            ) : (
              <p className="rounded-panel border border-line bg-primary-softer/30 px-3 py-2 text-sm text-ink">
                Site d&apos;affectation : <strong>{siteLabel ?? siteId ?? "—"}</strong>
              </p>
            )}
            <Select
              label="Rôle"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v })}
              options={[
                { value: "washer", label: ROLE_LABELS["washer"] },
                { value: "cashier", label: ROLE_LABELS["cashier"] },
                { value: "manager", label: ROLE_LABELS["manager"] },
                { value: "admin", label: ROLE_LABELS["admin"] },
              ]}
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
            <Select
              label="Type de contrat"
              value={form.contractType}
              onChange={(v) =>
                setForm({ ...form, contractType: v as "monthly" | "perVehicle" })
              }
              options={[
                { value: "perVehicle", label: CONTRACT_LABELS["perVehicle"] },
                { value: "monthly", label: CONTRACT_LABELS["monthly"] },
              ]}
            />
            {form.contractType === "monthly" ? (
              <Input
                label="Salaire mensuel (FCFA)"
                type="number"
                min={1}
                value={form.monthlySalary}
                onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                required
              />
            ) : (
              <div className="space-y-3">
                {canEdit && (
                  <p className="rounded-panel border border-line bg-primary-softer/35 px-3 py-2 text-sm text-ink">
                    Pourcentage global actif :{" "}
                    <strong>
                      {defaultCommissionPercent != null
                        ? `${defaultCommissionPercent} %`
                        : "non défini"}
                    </strong>{" "}
                    (tous les employés « par véhicule » sans grille propre).
                  </p>
                )}
                <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-line"
                    checked={useGlobalCommission}
                    onChange={(e) => {
                      setUseGlobalCommission(e.target.checked);
                      if (e.target.checked) setCommissions([]);
                    }}
                  />
                  <span>
                    Utiliser uniquement le pourcentage global{" "}
                    {defaultCommissionPercent != null
                      ? `(${defaultCommissionPercent} % du montant commande)`
                      : "(configurez-le ci-dessous)"}
                  </span>
                </label>
                {!useGlobalCommission && (
                  <>
                    <p className="text-sm font-semibold text-ink">Commissions par type de véhicule</p>
                    {commissions.map((row, index) => (
                      <div key={`${row.vehicleTypeId}-${index}`} className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[120px] flex-1">
                          <Select
                            label="Type véhicule"
                            value={row.vehicleTypeId}
                            onChange={(v) => {
                              const next = [...commissions];
                              const cur = next[index];
                              if (!cur) return;
                              next[index] = { ...cur, vehicleTypeId: v };
                              setCommissions(next);
                            }}
                            options={vehicleTypes.map((v) => ({
                              value: v.id,
                              label: v.name,
                            }))}
                          />
                        </div>
                        <div className="min-w-[100px] w-36">
                          <Select
                            label="Mode"
                            value={row.mode}
                            onChange={(v) => {
                              const next = [...commissions];
                              const cur = next[index];
                              if (!cur) return;
                              next[index] = { ...cur, mode: v as "fixed" | "percent" };
                              setCommissions(next);
                            }}
                            options={[
                              { value: "fixed", label: "Montant fixe" },
                              { value: "percent", label: "Pourcentage" },
                            ]}
                          />
                        </div>
                        <div className="min-w-[100px] flex-1">
                          <Input
                            label={row.mode === "percent" ? "Valeur (%)" : "Montant (FCFA)"}
                            type="number"
                            min={0}
                            max={row.mode === "percent" ? 100 : undefined}
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...commissions];
                              const cur = next[index];
                              if (!cur) return;
                              next[index] = { ...cur, amount: e.target.value };
                              setCommissions(next);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setCommissions((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Retirer
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={vehicleTypes.length === 0}
                      onClick={addCommissionRow}
                    >
                      Ajouter une commission
                    </Button>
                  </>
                )}
              </div>
            )}
            <Input
              label="Date d'embauche"
              type="date"
              value={form.hireDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              required
            />
          </section>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
}