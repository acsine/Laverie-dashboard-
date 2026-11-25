"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { cleanOptionalString } from "@/lib/sanitize-server-action";
import { catalogKindFromEntityKey } from "@/lib/catalogue-routes";
import { canDirectPush, isPlatformUser, requireSessionForAction } from "@/server/auth/guards";
import { resolveMutationSiteId } from "@/server/auth/site-scope";
import type { EntityKey } from "@/server/cloud/entity-sync";
import { deleteEntityCloud, upsertEntityCloud } from "@/server/cloud/entity-sync";
import {
  ordersUseService,
  ordersUseVehicleType,
  serviceIdsInCategory,
  vehicleTypeIdsInCategory,
} from "@/server/catalogue/delete-guards";

const nameSchema = z.object({
  id: z.string().optional(),
  entityType: z.enum([
    "service_categories",
    "services",
    "vehicle_categories",
    "vehicle_types",
    "pricing",
  ]),
  name: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  serviceCategoryId: z.string().optional(),
  serviceId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  price: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
  lavSiteId: z.string().optional(),
  createdAt: z.string().optional(),
});

type Result = { ok: true } | { ok: false; error: AppError };

export async function saveCatalogItemAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }
  const input = {
    ...parsed.data,
    id: cleanOptionalString(parsed.data.id),
    createdAt: cleanOptionalString(parsed.data.createdAt),
    name: cleanOptionalString(parsed.data.name),
    description: cleanOptionalString(parsed.data.description),
    categoryId: cleanOptionalString(parsed.data.categoryId),
    serviceCategoryId: cleanOptionalString(parsed.data.serviceCategoryId),
    serviceId: cleanOptionalString(parsed.data.serviceId),
    vehicleTypeId: cleanOptionalString(parsed.data.vehicleTypeId),
    lavSiteId: cleanOptionalString(parsed.data.lavSiteId),
  };
  let siteId: string | null;
  if (isPlatformUser(session)) {
    const scope = input.lavSiteId?.trim();
    if (!scope || scope === "universal") {
      siteId = null;
    } else {
      siteId = scope;
    }
    if (!siteId && scope !== "universal") {
      siteId = resolveMutationSiteId(session, input.lavSiteId);
    }
  } else {
    const scoped = resolveMutationSiteId(session);
    if (!scoped) {
      return { ok: false, error: appError("VALIDATION", "Site agence requis pour le catalogue.") };
    }
    siteId = scoped;
  }
  const type = input.entityType as EntityKey;
  const id = input.id ?? newEntityId(type.slice(0, 4));
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id,
    lavSiteId: siteId ?? null,
    isActive: input.isActive ?? true,
    createdAt: input.id && input.createdAt ? input.createdAt : now,
    updatedAt: now,
  };

  if (type === "pricing") {
    if (!input.serviceId || !input.vehicleTypeId || input.price == null) {
      return { ok: false, error: appError("VALIDATION", "Service, type véhicule et prix requis.") };
    }
    payload.name = input.name || "Tarif";
    payload.serviceId = input.serviceId;
    payload.vehicleTypeId = input.vehicleTypeId;
    payload.price = input.price;
    payload.estimatedDurationMinutes = 30;
    payload.validFrom = now;
  } else if (type === "vehicle_types") {
    if (!input.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = input.name.trim();
    payload.description = input.description ?? "";
    payload.categoryId = input.categoryId ?? null;
  } else if (type === "services") {
    if (!input.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = input.name.trim();
    payload.description = input.description ?? "";
    payload.type = input.serviceCategoryId ?? input.categoryId ?? "standard";
    payload.estimatedDurationMinutes = 30;
  } else {
    if (!input.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = input.name.trim();
    payload.description = input.description ?? "";
  }

  try {
    await upsertEntityCloud(type, payload);
    revalidatePath("/catalogue");
    const kind = catalogKindFromEntityKey(type);
    if (kind) revalidatePath(`/catalogue/${kind}/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function deleteCatalogItemAction(
  entityType: EntityKey,
  itemId: string,
): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }

  const { loadWorkspaceEntities } = await import("@/server/entities/load-entities");
  const { entities } = await loadWorkspaceEntities(session);
  const raw = ((entities[entityType] ?? []) as Record<string, unknown>[]).find(
    (e) => String(e.id) === itemId,
  );
  if (!raw) {
    return { ok: false, error: appError("NOT_FOUND", "Élément introuvable.") };
  }
  const siteId = String(raw.lavSiteId ?? raw.lav_site_id ?? "");

  if (entityType === "services" && ordersUseService(entities, itemId)) {
    return {
      ok: false,
      error: appError("DELETE", "Impossible : ce service a déjà été utilisé sur une commande."),
    };
  }
  if (entityType === "vehicle_types" && ordersUseVehicleType(entities, itemId)) {
    return {
      ok: false,
      error: appError(
        "DELETE",
        "Impossible : ce type de véhicule a déjà été utilisé sur une commande.",
      ),
    };
  }
  if (entityType === "service_categories") {
    const blocked = serviceIdsInCategory(entities, itemId).some((sid) =>
      ordersUseService(entities, sid),
    );
    if (blocked) {
      return {
        ok: false,
        error: appError(
          "DELETE",
          "Impossible : une commande utilise un service de cette catégorie.",
        ),
      };
    }
  }
  if (entityType === "vehicle_categories") {
    const blocked = vehicleTypeIdsInCategory(entities, itemId).some((tid) =>
      ordersUseVehicleType(entities, tid),
    );
    if (blocked) {
      return {
        ok: false,
        error: appError(
          "DELETE",
          "Impossible : une commande utilise un type de cette catégorie.",
        ),
      };
    }
  }

  try {
    await deleteEntityCloud(entityType, itemId, {
      id: itemId,
      ...(siteId ? { lavSiteId: siteId } : {}),
    });
    revalidatePath("/catalogue");
    const kind = catalogKindFromEntityKey(entityType);
    if (kind) revalidatePath(`/catalogue/${kind}/${itemId}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: appError("DELETE", e instanceof Error ? e.message : "Suppression impossible"),
    };
  }
}