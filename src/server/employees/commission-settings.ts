"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { parseDefaultCommissionPercent } from "@/lib/employee-commission";
import { getSupabase } from "@/lib/supabase";
import { canDirectPush, requireSessionForAction } from "@/server/auth/guards";
import { pullCloudSnapshot } from "@/server/cloud/entity-sync";

type Result = { ok: true; percent: number | null } | { ok: false; error: AppError };

export async function getDefaultCommissionPercentAction(): Promise<number | null> {
  const session = await requireSessionForAction();
  if (!session) return null;
  try {
    const snap = await pullCloudSnapshot();
    return parseDefaultCommissionPercent(snap.appConfig);
  } catch {
    return null;
  }
}

const schema = z.object({
  percent: z.coerce.number().min(0).max(100),
});

export async function saveDefaultCommissionPercentAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé aux administrateurs.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }
  const percent = parsed.data.percent;
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("app_config")
      .update({
        per_vehicle_default_commission_percent: percent > 0 ? percent : null,
        updated_at: now,
      })
      .eq("id", "default");
    if (error) {
      return {
        ok: false,
        error: appError(
          "SAVE",
          `${error.message}. Exécutez scripts/app-config-commission-percent.sql dans Supabase si la colonne manque.`,
        ),
      };
    }
    revalidatePath("/employes");
    return { ok: true, percent: percent > 0 ? percent : null };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}