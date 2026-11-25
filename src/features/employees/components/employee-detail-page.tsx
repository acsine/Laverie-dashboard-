"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Breadcrumbs, Button, toast } from "@/components/ui";
import { useConfirm } from "@/hooks/use-confirm";
import { DEFAULT_TENANT_PASSWORD } from "@/lib/default-tenant-password";
import { deleteEmployeeAction, resetEmployeePasswordAction } from "@/server/employees/actions";
import { roleNeedsLogin } from "./employee-labels";
import type { EmployeeKpiPack } from "@/server/employees/get-employee-kpis";
import { EmployeeDetailContent } from "./employee-detail-content";
import type { EmployeeRow } from "./employees-page";

type Props = {
  employee: EmployeeRow;
  kpis: EmployeeKpiPack;
  siteLabel: string | null;
  canEdit: boolean;
  isPlatform: boolean;
  listHref: string;
};

export function EmployeeDetailPage({
  employee,
  kpis,
  siteLabel,
  canEdit,
  isPlatform,
  listHref,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [resetPending, startReset] = useTransition();
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();

  const editHref = `${listHref}${listHref.includes("?") ? "&" : "?"}edit=${encodeURIComponent(employee.id)}`;

  function onResetPassword() {
    confirm(
      {
        title: "Réinitialiser le mot de passe",
        description: `Réinitialiser le mot de passe de ${fullName} à « ${DEFAULT_TENANT_PASSWORD} » ?`,
        confirmLabel: "Réinitialiser",
      },
      () => {
        startReset(async () => {
          const res = await resetEmployeePasswordAction(employee.id);
          if (!res.ok) {
            toast(res.error.message, "danger");
            return;
          }
          toast(`Mot de passe réinitialisé : ${DEFAULT_TENANT_PASSWORD}`, "success");
          router.refresh();
        });
      },
    );
  }

  function onDelete() {
    confirm(
      {
        title: "Supprimer l'employé",
        description: `Supprimer définitivement ${fullName} ?\n\nImpossible si cet employé est assigné à des commandes.`,
        confirmLabel: "Supprimer",
      },
      () => {
        startTransition(async () => {
          const res = await deleteEmployeeAction(employee.id);
          if (!res.ok) {
            toast(res.error.message, "danger");
            return;
          }
          toast("Employé supprimé", "success");
          router.push(listHref);
          router.refresh();
        });
      },
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Plateforme" },
          { label: "Employés", href: listHref },
          { label: fullName || employee.id },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Fiche employé</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={listHref}>
            <Button type="button" variant="ghost">
              Retour à la liste
            </Button>
          </Link>
          {canEdit && (
            <>
              {isPlatform && roleNeedsLogin(employee.role) && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={resetPending}
                  onClick={onResetPassword}
                >
                  Réinitialiser mot de passe
                </Button>
              )}
              <Link href={editHref}>
                <Button type="button" variant="secondary">
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
              <Button type="button" variant="danger" loading={pending} onClick={onDelete}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      <EmployeeDetailContent employee={employee} kpis={kpis} siteLabel={siteLabel} />
      {confirmDialog}
    </div>
  );
}