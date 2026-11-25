import type { EntityKey } from "@/server/cloud/entity-sync";
import { catalogKindFromTab } from "@/lib/catalogue-routes";
import { CATALOG_KINDS } from "@/lib/catalogue-routes";

export type CatalogFormState = {
  name: string;
  description: string;
  serviceId: string;
  vehicleTypeId: string;
  price: string;
  categoryId: string;
  serviceCategoryId: string;
  isActive: boolean;
};

/** Payload minimal par onglet — aucun champ `undefined` (évite "$undefined" côté Server Actions). */
export function buildCatalogSavePayload(
  tab: string,
  form: CatalogFormState,
  opts: {
    editingId?: string;
    editingCreatedAt?: string;
    formScope: string;
    siteId: string | null;
    isPlatform: boolean;
  },
): { payload: Record<string, unknown> | null; clientError?: string } {
  const kind = catalogKindFromTab(tab);
  const entityType = CATALOG_KINDS[kind].entityKey as EntityKey;

  const payload: Record<string, unknown> = {
    entityType,
    isActive: form.isActive,
    lavSiteId: opts.isPlatform ? opts.formScope : (opts.siteId ?? ""),
  };
  if (opts.editingId) payload.id = opts.editingId;
  if (opts.editingCreatedAt) payload.createdAt = opts.editingCreatedAt;

  switch (tab) {
    case "pricing": {
      const serviceId = form.serviceId.trim();
      const vehicleTypeId = form.vehicleTypeId.trim();
      const price = form.price.trim();
      if (!serviceId || !vehicleTypeId) {
        return {
          payload: null,
          clientError:
            "Pour un tarif, choisissez un service et un type de véhicule (pas une catégorie).",
        };
      }
      if (price === "" || Number.isNaN(Number(price))) {
        return { payload: null, clientError: "Indiquez un prix (FCFA)." };
      }
      payload.serviceId = serviceId;
      payload.vehicleTypeId = vehicleTypeId;
      payload.price = Number(price);
      if (form.name.trim()) payload.name = form.name.trim();
      return { payload };
    }
    case "services": {
      const cat = form.serviceCategoryId.trim();
      if (!form.name.trim()) {
        return { payload: null, clientError: "Le nom du service est requis." };
      }
      if (!cat) {
        return { payload: null, clientError: "Choisissez une catégorie de service." };
      }
      payload.name = form.name.trim();
      payload.description = form.description;
      payload.serviceCategoryId = cat;
      return { payload };
    }
    case "veh-types": {
      const cat = form.categoryId.trim();
      if (!form.name.trim()) {
        return { payload: null, clientError: "Le nom du type est requis." };
      }
      if (!cat) {
        return { payload: null, clientError: "Choisissez une catégorie véhicule." };
      }
      payload.name = form.name.trim();
      payload.description = form.description;
      payload.categoryId = cat;
      return { payload };
    }
  default: {
      if (!form.name.trim()) {
        return { payload: null, clientError: "Le nom est requis." };
      }
      payload.name = form.name.trim();
      payload.description = form.description;
      return { payload };
    }
  }
}

/** Options service / type alignées sur la portée choisie dans la modale (universel vs site). */
export function catalogOptionsForScope(
  rows: { id: string; name: string; lavSiteId?: string | null }[],
  formScope: string,
  isPlatform: boolean,
): { value: string; label: string }[] {
  const filtered = rows.filter((row) => {
    if (!isPlatform) return true;
    const sid = row.lavSiteId?.trim() || null;
    if (formScope === "universal") return !sid;
    return !sid || sid === formScope;
  });
  return filtered.map((r) => ({ value: r.id, label: r.name }));
}