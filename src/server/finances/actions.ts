"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { canDirectPush, requireSessionForAction } from "@/server/auth/guards";
import { resolveMutationSiteId } from "@/server/auth/site-scope";
import { pullCloudEntities, filterEntitiesBySite, upsertEntityCloud } from "@/server/cloud/entity-sync";

const expenseSchema = z.object({
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  category: z.string().default("other"),
  description: z.string().optional(),
});

type Result = { ok: true } | { ok: false; error: AppError };

export async function saveExpenseAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }
  const siteId = resolveMutationSiteId(session);
  if (!siteId) {
    return { ok: false, error: appError("VALIDATION", "Site requis pour enregistrer une dépense.") };
  }
  const id = newEntityId("exp");
  const now = new Date().toISOString();
  const payload = {
    id,
    lavSiteId: siteId,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    category: parsed.data.category,
    amount: parsed.data.amount,
    date: now.slice(0, 10),
    isApproved: false,
    createdBy: session.email,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await upsertEntityCloud("expenses", payload);
    revalidatePath("/finances");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function approveExpenseAction(expenseId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Approbation réservée admin.") };
  }
  const siteId = resolveMutationSiteId(session);
  const pull = await pullCloudEntities();
  const pool = siteId ? filterEntitiesBySite(pull.entities, siteId).expenses : pull.entities.expenses;
  const existing = (pool ?? []).find((x) => String(x.id) === expenseId);
  if (!existing) {
    return { ok: false, error: appError("NOT_FOUND", "Dépense introuvable") };
  }
  const now = new Date().toISOString();
  try {
    await upsertEntityCloud("expenses", {
      ...existing,
      isApproved: true,
      approvedBy: session.email,
      approvedAt: now,
      updatedAt: now,
    });
    revalidatePath("/finances");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}