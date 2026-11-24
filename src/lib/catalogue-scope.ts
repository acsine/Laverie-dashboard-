import type { EntityKey } from "@/server/cloud/entity-sync";

export const CATALOG_ENTITY_KEYS: EntityKey[] = [
  "service_categories",
  "services",
  "vehicle_categories",
  "vehicle_types",
  "pricing",
];

export function isCatalogEntityKey(key: string): boolean {
  return CATALOG_ENTITY_KEYS.includes(key as EntityKey);
}

function siteIdOf(row: Record<string, unknown>): string | null {
  const v = row.lavSiteId ?? row.lav_site_id;
  return v ? String(v) : null;
}

/** Filtre site : catalogue = lignes universelles (sans site) + lignes du site. */
export function catalogRowMatchesSite(row: Record<string, unknown>, lavSiteId: string): boolean {
  const sid = siteIdOf(row);
  return !sid || sid === lavSiteId;
}

export type PricingRow = {
  serviceId: string;
  vehicleTypeId: string;
  price: number;
  lavSiteId?: string | null;
};

/** Priorité : tarif site > tarif universel. */
export function resolveCatalogPrice(
  pricing: PricingRow[],
  serviceId: string,
  vehicleTypeId: string,
  orderSiteId: string | null,
): number {
  const matches = pricing.filter(
    (p) => p.serviceId === serviceId && p.vehicleTypeId === vehicleTypeId,
  );
  if (!matches.length) return 0;
  if (orderSiteId) {
    const siteRow = matches.find((p) => p.lavSiteId === orderSiteId);
    if (siteRow) return siteRow.price;
  }
  const universal = matches.find((p) => !p.lavSiteId);
  if (universal) return universal.price;
  return matches[0]?.price ?? 0;
}