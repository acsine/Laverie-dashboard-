import type { CatalogKind } from "@/lib/catalogue-routes";
import { catalogKindFromEntityKey } from "@/lib/catalogue-routes";
import type { EntityKey } from "@/server/cloud/entity-sync";

export type CatalogRow = {
  id: string;
  name: string;
  description: string;
  extra?: string;
  kind: CatalogKind;
  categoryId?: string;
  serviceCategoryId?: string;
  serviceId?: string;
  vehicleTypeId?: string;
  price?: number;
  isActive: boolean;
  createdAt?: string;
  lavSiteId?: string | null;
  scopeLabel?: string;
};

export function mapCatalogRows(
  entityKey: EntityKey,
  rows: Record<string, unknown>[],
  labelMaps?: {
    categories?: Map<string, string>;
    services?: Map<string, string>;
    vehicleTypes?: Map<string, string>;
    sites?: Map<string, string>;
  },
): CatalogRow[] {
  const kind = catalogKindFromEntityKey(entityKey);
  if (!kind) return [];

  const scopeOf = (lavSiteId: string | null): string => {
    if (!lavSiteId) return "Universel";
    return labelMaps?.sites?.get(lavSiteId) ?? lavSiteId;
  };

  return rows.map((r) => {
    const id = String(r.id);
    const name = String(r.name ?? "");
    const description = String(r.description ?? "");
    const isActive = r.isActive !== false && r.is_active !== false;
    const lavSiteIdRaw = r.lavSiteId ?? r.lav_site_id;
    const lavSiteId =
      lavSiteIdRaw != null && String(lavSiteIdRaw).trim() ? String(lavSiteIdRaw) : null;
    const scopeLabel = scopeOf(lavSiteId);

    if (entityKey === "pricing") {
      const serviceId = String(r.serviceId ?? r.service_id ?? "");
      const vehicleTypeId = String(r.vehicleTypeId ?? r.vehicle_type_id ?? "");
      const price = Number(r.price ?? 0);
      const serviceName = labelMaps?.services?.get(serviceId) ?? serviceId;
      const vtName = labelMaps?.vehicleTypes?.get(vehicleTypeId) ?? vehicleTypeId;
      return {
        id,
        name: name || `${serviceName} × ${vtName}`,
        description,
        extra: `${price.toLocaleString("fr-FR")} FCFA`,
        kind,
        serviceId,
        vehicleTypeId,
        price,
        isActive,
        createdAt: String(r.createdAt ?? r.created_at ?? ""),
        lavSiteId,
        scopeLabel,
      };
    }

    if (entityKey === "vehicle_types") {
      const categoryId = String(r.categoryId ?? r.category_id ?? "");
      const catName = labelMaps?.categories?.get(categoryId);
      return {
        id,
        name,
        description,
        extra: catName ?? (categoryId || undefined),
        kind,
        categoryId: categoryId || undefined,
        isActive,
        createdAt: String(r.createdAt ?? r.created_at ?? ""),
        lavSiteId,
        scopeLabel,
      };
    }

    if (entityKey === "services") {
      const serviceCategoryId = String(r.type ?? r.categoryId ?? "");
      const catName = labelMaps?.categories?.get(serviceCategoryId);
      return {
        id,
        name,
        description,
        extra: catName ?? (serviceCategoryId || undefined),
        kind,
        serviceCategoryId: serviceCategoryId || undefined,
        isActive,
        createdAt: String(r.createdAt ?? r.created_at ?? ""),
        lavSiteId,
        scopeLabel,
      };
    }

    return {
      id,
      name,
      description,
      extra: description || undefined,
      kind,
      isActive,
      createdAt: String(r.createdAt ?? r.created_at ?? ""),
      lavSiteId,
      scopeLabel,
    };
  });
}