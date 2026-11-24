"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { normalizeOrderStatus, type OrderStatusCanonical } from "@/lib/order-status";
import { canDirectPush, isPlatformUser, requireSessionForAction, resolveSiteScope } from "@/server/auth/guards";
import { resolveMutationSiteId } from "@/server/auth/site-scope";
import {
  filterEntitiesBySite,
  pullCloudEntities,
  upsertEntityCloud,
} from "@/server/cloud/entity-sync";
import { ensureRevenueForOrder } from "@/server/orders/ensure-revenue";

const STATUS_VALUES = [
  "waiting",
  "assigned",
  "inProgress",
  "completed",
  "delivered",
  "cancelled",
] as const;

const newOrderSchema = z.object({
  lavSiteId: z.string().optional(),
  customerId: z.string(),
  vehicleTypeId: z.string(),
  vehicleId: z.string().optional(),
  serviceIds: z.array(z.string()).min(1),
  totalAmount: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(["cash", "mobileMoney", "card", "bankTransfer"]).default("cash"),
  notes: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
});

const statusSchema = z.object({
  id: z.string(),
  status: z.enum(STATUS_VALUES),
});

const assignSchema = z.object({
  id: z.string(),
  assignedEmployeeId: z.string().nullable(),
  startWash: z.boolean().optional(),
});

type Result = { ok: true; id?: string } | { ok: false; error: AppError };

function resolveOrderSiteId(
  session: NonNullable<Awaited<ReturnType<typeof requireSessionForAction>>>,
  explicitSiteId?: string,
): string | null {
  if (!isPlatformUser(session)) {
    return resolveMutationSiteId(session);
  }
  return resolveMutationSiteId(session, explicitSiteId);
}

async function findOrderEntity(
  session: NonNullable<Awaited<ReturnType<typeof requireSessionForAction>>>,
  orderId: string,
  orderSiteId?: string | null,
) {
  const pull = await pullCloudEntities();
  const scopeSite = orderSiteId ?? resolveSiteScope(session);
  const pool = scopeSite
    ? filterEntitiesBySite(pull.entities, scopeSite).orders
    : pull.entities.orders;
  const existing = (pool ?? []).find((o) => String(o.id) === orderId);
  return { existing, entities: pull.entities };
}

function pickupCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export async function createOrderAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = newOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }

  const siteId = resolveOrderSiteId(session, parsed.data.lavSiteId);
  if (!siteId) {
    return {
      ok: false,
      error: appError(
        "VALIDATION",
        isPlatformUser(session)
          ? "Choisissez un site avant de créer la commande."
          : "Site manquant.",
      ),
    };
  }

  const id = newEntityId("ord");
  const now = new Date().toISOString();
  const discount = parsed.data.discount ?? 0;
  const code = pickupCode();

  const payload: Record<string, unknown> = {
    id,
    lavSiteId: siteId,
    customerId: parsed.data.customerId,
    vehicleTypeId: parsed.data.vehicleTypeId,
    vehicleId: parsed.data.vehicleId ?? "",
    serviceIds: parsed.data.serviceIds,
    status: parsed.data.assignedEmployeeId ? "assigned" : "waiting",
    totalAmount: parsed.data.totalAmount,
    discount,
    paymentMethod: parsed.data.paymentMethod,
    notes: parsed.data.notes ?? "",
    pickupCode: code,
    invoiceNumber: `FAC-${code}`,
    assignedEmployeeId: parsed.data.assignedEmployeeId ?? "",
    createdAt: now,
    updatedAt: now,
    createdBy: session.email,
  };

  try {
    await upsertEntityCloud("orders", payload);
    revalidatePath("/commandes");
    revalidatePath(`/commandes/${id}`);
    revalidatePath("/finances");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function updateOrderStatusAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", "Statut invalide") };
  }

  const { existing, entities } = await findOrderEntity(session, parsed.data.id);
  if (!existing) {
    return { ok: false, error: appError("NOT_FOUND", "Commande introuvable") };
  }

  const now = new Date().toISOString();
  const status = parsed.data.status as OrderStatusCanonical;
  const patch: Record<string, unknown> = {
    ...existing,
    status,
    updatedAt: now,
    updatedBy: session.email,
  };

  if (status === "inProgress") patch.startedAt = patch.startedAt ?? now;
  if (status === "completed") patch.completedAt = now;
  if (status === "delivered") patch.pickedUpAt = now;

  try {
    await upsertEntityCloud("orders", patch);
    if (status === "completed" || status === "delivered") {
      await ensureRevenueForOrder(entities, patch);
    }
    revalidatePath("/commandes");
    revalidatePath(`/commandes/${parsed.data.id}`);
    revalidatePath("/finances");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function assignOrderEmployeeAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", "Données invalides") };
  }

  const { existing } = await findOrderEntity(session, parsed.data.id);
  if (!existing) {
    return { ok: false, error: appError("NOT_FOUND", "Commande introuvable") };
  }

  const now = new Date().toISOString();
  const current = normalizeOrderStatus(String(existing.status ?? "waiting"));
  let status: OrderStatusCanonical = current;
  if (parsed.data.assignedEmployeeId) {
    status = parsed.data.startWash ? "inProgress" : current === "waiting" ? "assigned" : current;
  }

  const patch: Record<string, unknown> = {
    ...existing,
    assignedEmployeeId: parsed.data.assignedEmployeeId ?? "",
    status,
    updatedAt: now,
    updatedBy: session.email,
  };
  if (status === "inProgress") patch.startedAt = patch.startedAt ?? now;

  try {
    await upsertEntityCloud("orders", patch);
    revalidatePath("/commandes");
    revalidatePath(`/commandes/${parsed.data.id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

/** Avance d'une étape (workflow mobile). */
export async function advanceOrderAction(orderId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  const { existing } = await findOrderEntity(session, orderId);
  if (!existing) return { ok: false, error: appError("NOT_FOUND", "Commande introuvable") };

  const current = normalizeOrderStatus(String(existing.status ?? "waiting"));
  const next: Record<OrderStatusCanonical, OrderStatusCanonical | null> = {
    waiting: "assigned",
    assigned: "inProgress",
    inProgress: "completed",
    completed: "delivered",
    delivered: null,
    cancelled: null,
  };
  const target = next[current];
  if (!target) {
    return { ok: false, error: appError("VALIDATION", "Aucune étape suivante") };
  }
  return updateOrderStatusAction({ id: orderId, status: target });
}