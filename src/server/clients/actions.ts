"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { canDirectPush, isPlatformUser, requireSessionForAction } from "@/server/auth/guards";
import { resolveMutationSiteId } from "@/server/auth/site-scope";
import { normalizePhoneNumber } from "@/lib/phone";
import { deleteEntityCloud, upsertEntityCloud } from "@/server/cloud/entity-sync";

const vehicleEntrySchema = z.object({
  id: z.string().optional(),
  matricule: z.string().min(2),
  marque: z.string().min(1),
  vehicleTypeId: z.string().min(1),
});

const customerSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1, "Téléphone requis"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  clientNumber: z.string().optional(),
  country: z.string().optional(),
  lavSiteId: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  vehicles: z.array(vehicleEntrySchema).default([]),
});

const vehicleSchema = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  matricule: z.string().min(2),
  marque: z.string().optional(),
  vehicleTypeId: z.string().min(1),
  lavSiteId: z.string().optional(),
});

type Result = { ok: true; id?: string } | { ok: false; error: AppError };

/** Clients / véhicules : périmètre global (pas de site obligatoire). */
function resolveOptionalCustomerSiteId(
  session: NonNullable<Awaited<ReturnType<typeof requireSessionForAction>>>,
  lavSiteId?: string,
): string | null {
  if (!isPlatformUser(session)) {
    return null;
  }
  const explicit = lavSiteId?.trim();
  if (explicit) return explicit;
  return resolveMutationSiteId(session, lavSiteId);
}

export async function saveCustomerAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé aux administrateurs.") };
  }
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }

  const isNew = !parsed.data.id;
  if (isNew && parsed.data.vehicles.length === 0) {
    return {
      ok: false,
      error: appError("VALIDATION", "Ajoutez au moins un véhicule avec type, marque et matricule."),
    };
  }

  for (const v of parsed.data.vehicles) {
    if (!v.matricule.trim() || !v.marque.trim() || !v.vehicleTypeId) {
      return { ok: false, error: appError("VALIDATION", "Tous les champs véhicule sont obligatoires.") };
    }
  }

  const country = parsed.data.country?.trim() ?? "";
  const phoneNorm = normalizePhoneNumber(parsed.data.phone, country);
  if (!phoneNorm.ok) {
    return { ok: false, error: appError("VALIDATION", phoneNorm.message) };
  }

  const siteId = resolveOptionalCustomerSiteId(session, parsed.data.lavSiteId);
  const id = parsed.data.id ?? newEntityId("cust");
  const now = new Date().toISOString();
  const firstVehicle = parsed.data.vehicles[0];
  const clientNumber = parsed.data.clientNumber?.trim() || `C${Date.now()}`;

  const payload = {
    id,
    lavSiteId: siteId ?? null,
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    phone: phoneNorm.e164,
    email: parsed.data.email?.trim() ?? "",
    address: parsed.data.address?.trim() ?? "",
    clientNumber,
    country: parsed.data.country?.trim() ?? "",
    matricule: firstVehicle?.matricule.trim() ?? "",
    marque: firstVehicle?.marque.trim() ?? "",
    isActive: parsed.data.isActive ?? true,
    createdAt: parsed.data.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await upsertEntityCloud("customers", payload);

    for (const entry of parsed.data.vehicles) {
      const vehicleId = entry.id ?? newEntityId("veh");
      await upsertEntityCloud("vehicles", {
        id: vehicleId,
        lavSiteId: siteId ?? null,
        customerId: id,
        matricule: entry.matricule.trim(),
        marque: entry.marque.trim(),
        vehicleTypeId: entry.vehicleTypeId,
        createdAt: now,
        updatedAt: now,
      });
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function saveVehicleAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalide") };
  }
  const siteId = resolveOptionalCustomerSiteId(session, parsed.data.lavSiteId);
  const id = parsed.data.id ?? newEntityId("veh");
  const now = new Date().toISOString();
  const payload = {
    id,
    lavSiteId: siteId ?? null,
    customerId: parsed.data.customerId,
    matricule: parsed.data.matricule.trim(),
    marque: parsed.data.marque?.trim() ?? "",
    vehicleTypeId: parsed.data.vehicleTypeId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await upsertEntityCloud("vehicles", payload);
    revalidatePath(`/clients/${parsed.data.customerId}`);
    revalidatePath("/clients");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function deleteVehicleAction(vehicleId: string, customerId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  try {
    await deleteEntityCloud("vehicles", vehicleId, { id: vehicleId });
    revalidatePath(`/clients/${customerId}`);
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("DELETE", e instanceof Error ? e.message : "Suppression impossible") };
  }
}

export async function deleteCustomerAction(customerId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  if (!canDirectPush(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé administrateur.") };
  }
  try {
    await deleteEntityCloud("customers", customerId, { id: customerId });
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("DELETE", e instanceof Error ? e.message : "Suppression impossible") };
  }
}