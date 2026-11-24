"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Breadcrumbs, Button, toast } from "@/components/ui";
import { useConfirm } from "@/hooks/use-confirm";
import { CATALOG_KINDS, type CatalogKind } from "@/lib/catalogue-routes";
import { deleteCatalogItemAction } from "@/server/catalogue/actions";
import type { CatalogKpiPack } from "@/server/catalogue/get-catalogue-kpis";
import type { CatalogRow } from "@/server/catalogue/map-catalogue";
import { CatalogueDetailContent } from "./catalogue-detail-content";

type Props = {
  item: CatalogRow;
  kind: CatalogKind;
  kpis: CatalogKpiPack;
  listHref: string;
  editHref: string;
  canEdit: boolean;
  siteLabel?: string | null;
  serviceLabel?: string | null;
  vehicleTypeLabel?: string | null;
  categoryLabel?: string | null;
};

export function CatalogueDetailPage({
  item,
  kind,
  kpis,
  listHref,
  editHref,
  canEdit,
  siteLabel,
  serviceLabel,
  vehicleTypeLabel,
  categoryLabel,
}: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const typeLabel = CATALOG_KINDS[kind].label;

  function onDelete() {
    confirm(
      {
        title: "Archiver",
        description: `Archiver « ${item.name} » ?`,
        confirmLabel: "Archiver",
      },
      () => {
        startTransition(async () => {
          const res = await deleteCatalogItemAction(CATALOG_KINDS[kind].entityKey, item.id);
          if (!res.ok) {
            toast(res.error.message, "danger");
            return;
          }
          toast("Élément archivé", "success");
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
          { label: "Catalogue", href: listHref },
          { label: item.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Fiche {typeLabel.toLowerCase()}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={listHref}>
            <Button type="button" variant="ghost">
              Retour
            </Button>
          </Link>
          {canEdit && (
            <>
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
      <CatalogueDetailContent
        item={item}
        kind={kind}
        kpis={kpis}
        siteLabel={siteLabel}
        serviceLabel={serviceLabel}
        vehicleTypeLabel={vehicleTypeLabel}
        categoryLabel={categoryLabel}
      />
      {confirmDialog}
    </div>
  );
}