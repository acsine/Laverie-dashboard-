"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
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
  let siteId: string | null;
  if (isPlatformUser(session)) {
    const raw = parsed.data.lavSiteId?.trim();
    if (raw === "" || raw === "universal") {
      siteId = null;
    } else if (raw) {
      siteId = raw;
    } else {
      siteId = resolveMutationSiteId(session, parsed.data.lavSiteId);
    }
  } else {
    const scoped = resolveMutationSiteId(session);
    if (!scoped) {
      return { ok: false, error: appError("VALIDATION", "Site agence requis pour le catalogue.") };
    }
    siteId = scoped;
  }
  const type = parsed.data.entityType as EntityKey;
  const id = parsed.data.id ?? newEntityId(type.slice(0, 4));
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id,
    lavSiteId: siteId ?? null,
    isActive: parsed.data.isActive ?? true,
    createdAt: parsed.data.id && parsed.data.createdAt ? parsed.data.createdAt : now,
    updatedAt: now,
  };

  if (type === "pricing") {
    if (!parsed.data.serviceId || !parsed.data.vehicleTypeId || parsed.data.price == null) {
      return { ok: false, error: appError("VALIDATION", "Service, type véhicule et prix requis.") };
    }
    payload.name = parsed.data.name || "Tarif";
    payload.serviceId = parsed.data.serviceId;
    payload.vehicleTypeId = parsed.data.vehicleTypeId;
    payload.price = parsed.data.price;
    payload.estimatedDurationMinutes = 30;
    payload.validFrom = now;
  } else if (type === "vehicle_types") {
    if (!parsed.data.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = parsed.data.name.trim();
    payload.description = parsed.data.description ?? "";
    payload.categoryId = parsed.data.categoryId ?? null;
  } else if (type === "services") {
    if (!parsed.data.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = parsed.data.name.trim();
    payload.description = parsed.data.description ?? "";
    payload.type = parsed.data.serviceCategoryId ?? parsed.data.categoryId ?? "standard";
    payload.estimatedDurationMinutes = 30;
  } else {
    if (!parsed.data.name?.trim()) {
      return { ok: false, error: appError("VALIDATION", "Nom requis.") };
    }
    payload.name = parsed.data.name.trim();
    payload.description = parsed.data.description ?? "";
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