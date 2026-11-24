"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, isAppError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { canManagePlatform, requireSessionForAction } from "@/server/auth/guards";
import { normalizeOptionalPhone } from "@/lib/phone-server";
import {
  platformAssignEmployeeAsSiteAdmin,
  platformSiteDelete,
  platformSiteUpsert,
} from "@/server/cloud/platform-api";

const schema = z
  .object({
    id: z.string().optional(),
    nom: z.string().min(2),
    adresse: z.string().default(""),
    ville: z.string().default(""),
    pays: z.string().default("Cameroun"),
    telephone: z.string().optional(),
    isActive: z.boolean().default(true),
    adminEmployeeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.id && !data.adminEmployeeId) {
      ctx.addIssue({
        code: "custom",
        message: "Sélectionnez l'employé administrateur du site",
        path: ["adminEmployeeId"],
      });
    }
  });

type Result = { ok: true } | { ok: false; error: AppError };

export async function saveSiteAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée. Reconnectez-vous.") };
  }
  if (!canManagePlatform(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé au super admin plateforme.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }

  const isNew = !parsed.data.id;
  const id = parsed.data.id ?? newEntityId("lav_site");

  const telNorm = normalizeOptionalPhone(parsed.data.telephone, parsed.data.pays);
  if (!telNorm.ok) {
    return { ok: false, error: appError("VALIDATION", telNorm.message) };
  }

  try {
    await platformSiteUpsert({
      id,
      nom: parsed.data.nom,
      adresse: parsed.data.adresse,
      ville: parsed.data.ville,
      pays: parsed.data.pays,
      telephone: telNorm.e164,
      isActive: parsed.data.isActive,
    });

    if (isNew && parsed.data.adminEmployeeId) {
      await platformAssignEmployeeAsSiteAdmin(parsed.data.adminEmployeeId, id);
    }

    revalidatePath("/sites");
    revalidatePath(`/sites/${id}`);
    revalidatePath("/employes");
    return { ok: true };
  } catch (e) {
    if (isAppError(e)) {
      return { ok: false, error: e };
    }
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function deleteSiteAction(siteId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }
  if (!canManagePlatform(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé plateforme.") };
  }
  try {
    await platformSiteDelete(siteId);
    revalidatePath("/sites");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("DELETE", e instanceof Error ? e.message : "Erreur") };
  }
}