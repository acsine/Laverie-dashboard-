"use server";

import { revalidatePath } from "next/cache";
import { appError, type AppError } from "@/lib/errors";
import { canApproveTrialExtension, requireSessionForAction } from "@/server/auth/guards";
import { trialApproveExtension, trialRequestExtension } from "@/server/cloud/platform-api";

type Result = { ok: true } | { ok: false; error: AppError };

export async function requestTrialExtensionAction(): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  try {
    await trialRequestExtension();
    revalidatePath("/essai");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Erreur";
    return { ok: false, error: appError("TRIAL", msg) };
  }
}

export async function approveTrialExtensionAction(
  months: number,
  lavSiteId?: string | null,
): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canApproveTrialExtension(session)) {
    return {
      ok: false,
      error: appError("FORBIDDEN", "Réservé au gestionnaire essai autorisé."),
    };
  }
  if (months < 1 || months > 24) {
    return { ok: false, error: appError("VALIDATION", "Durée entre 1 et 24 mois.") };
  }
  try {
    await trialApproveExtension(months, lavSiteId);
    revalidatePath("/essai");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Erreur";
    return { ok: false, error: appError("TRIAL", msg) };
  }
}