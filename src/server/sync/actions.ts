"use server";

import { revalidatePath } from "next/cache";
import { appError, type AppError } from "@/lib/errors";
import { canDirectPush, requireSessionForAction } from "@/server/auth/guards";
import { pullCloudSnapshot } from "@/server/cloud/entity-sync";
import { syncApproveBatch } from "@/server/cloud/platform-api";

type Result = { ok: true } | { ok: false; error: AppError };

export async function refreshCloudAction(): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  try {
    await pullCloudSnapshot();
    revalidatePath("/sync");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SYNC", e instanceof Error ? e.message : "Pull échoué") };
  }
}

export async function approveSyncBatchAction(batchId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Approbation réservée admin.") };
  }
  try {
    await syncApproveBatch(batchId);
    revalidatePath("/sync");
    return { ok: true };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Erreur";
    return { ok: false, error: appError("SYNC", msg) };
  }
}