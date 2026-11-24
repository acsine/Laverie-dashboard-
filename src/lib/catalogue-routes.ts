import type { EntityKey } from "@/server/cloud/entity-sync";

export const CATALOG_KINDS = {
  "service-categories": {
    entityKey: "service_categories" as EntityKey,
    label: "Catégorie de service",
    tabId: "svc-cat",
  },
  services: { entityKey: "services" as EntityKey, label: "Service", tabId: "services" },
  "vehicle-categories": {
    entityKey: "vehicle_categories" as EntityKey,
    label: "Catégorie véhicule",
    tabId: "veh-cat",
  },
  "vehicle-types": { entityKey: "vehicle_types" as EntityKey, label: "Type véhicule", tabId: "veh-types" },
  pricing: { entityKey: "pricing" as EntityKey, label: "Tarif", tabId: "pricing" },
} as const;

export type CatalogKind = keyof typeof CATALOG_KINDS;

const TAB_TO_KIND: Record<string, CatalogKind> = Object.fromEntries(
  Object.entries(CATALOG_KINDS).map(([kind, meta]) => [meta.tabId, kind as CatalogKind]),
) as Record<string, CatalogKind>;

export function catalogKindFromTab(tab: string): CatalogKind {
  return TAB_TO_KIND[tab] ?? "services";
}

export function catalogKindFromEntityKey(key: EntityKey): CatalogKind | null {
  for (const [kind, meta] of Object.entries(CATALOG_KINDS)) {
    if (meta.entityKey === key) return kind as CatalogKind;
  }
  return null;
}

export function catalogDetailHref(kind: CatalogKind, id: string, siteId?: string | null): string {
  const base = `/catalogue/${kind}/${encodeURIComponent(id)}`;
  return siteId ? `${base}?site=${encodeURIComponent(siteId)}` : base;
}

export function isCatalogKind(value: string): value is CatalogKind {
  return value in CATALOG_KINDS;
}