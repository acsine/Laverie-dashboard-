"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEFAULT_TENANT_PASSWORD } from "@/lib/default-tenant-password";
import { appError, type AppError } from "@/lib/errors";
import { newEntityId } from "@/lib/ids";
import { parseVehicleCommissionRules, serializeVehicleCommissionRules } from "@/lib/employee-commission";
import { employeeCloudPayloadFromRaw } from "@/server/employees/build-employee-payload";
import { canMutateCloud, isPlatformUser, requireSessionForAction } from "@/server/auth/guards";
import { resolveMutationSiteId } from "@/server/auth/site-scope";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  deleteEntityCloud,
  hashPasswordEdge,
  upsertEntityCloud,
} from "@/server/cloud/entity-sync";
import { ordersUseEmployee } from "@/server/catalogue/delete-guards";

const schema = z
  .object({
    id: z.string().optional(),
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().optional().or(z.literal("")),
    phone: z.string().min(1, "Téléphone requis"),
    phoneCountry: z.string().optional(),
    role: z.enum(["admin", "manager", "cashier", "washer"]),
    password: z.string().optional(),
    isActive: z.boolean().default(true),
    contractType: z.enum(["monthly", "perVehicle"]).default("perVehicle"),
    monthlySalary: z.coerce.number().optional(),
    hireDate: z.string().optional(),
    ratePerVehicleType: z.record(z.string(), z.unknown()).optional(),
    lavSiteId: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const needsAuth = data.role === "admin" || data.role === "manager";
    const email = data.email?.trim() ?? "";
    if (needsAuth) {
      if (!email) {
        ctx.addIssue({ code: "custom", message: "E-mail requis pour ce rôle", path: ["email"] });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({ code: "custom", message: "E-mail invalide", path: ["email"] });
      }
      if (!data.id && (!data.password || data.password.length < 6)) {
        ctx.addIssue({
          code: "custom",
          message: "Mot de passe requis (min. 6 caractères)",
          path: ["password"],
        });
      }
    }
    if (data.contractType === "monthly") {
      const sal = data.monthlySalary ?? 0;
      if (sal <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Salaire mensuel requis",
          path: ["monthlySalary"],
        });
      }
    }
    if (data.password && data.password.length > 0 && data.password.length < 6) {
      ctx.addIssue({ code: "custom", message: "Minimum 6 caractères", path: ["password"] });
    }
  });

type Result = { ok: true } | { ok: false; error: AppError };

export async function saveEmployeeAction(raw: unknown): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }
  if (!canMutateCloud(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé aux administrateurs.") };
  }

  const platform = isPlatformUser(session);
  let normalizedInput: unknown = raw;
  if (platform && raw && typeof raw === "object") {
    const body = { ...(raw as Record<string, unknown>) };
    const role = String(body.role ?? "");
    const needsAuth = role === "admin" || role === "manager";
    if (!body.id && needsAuth) {
      body.password = DEFAULT_TENANT_PASSWORD;
    } else {
      delete body.password;
    }
    normalizedInput = body;
  }

  const parsed = schema.safeParse(normalizedInput);
  if (!parsed.success) {
    return { ok: false, error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Données invalides") };
  }

  let siteId = isPlatformUser(session)
    ? resolveMutationSiteId(session, parsed.data.lavSiteId)
    : resolveMutationSiteId(session);
  if (!siteId && parsed.data.id) {
    const { loadWorkspaceEntities } = await import("@/server/entities/load-entities");
    const { entities } = await loadWorkspaceEntities(session);
    const existing = ((entities.employees ?? []) as Record<string, unknown>[]).find(
      (e) => String(e.id) === parsed.data.id,
    );
    const fromRow = existing?.lavSiteId ?? existing?.lav_site_id;
    siteId = fromRow ? String(fromRow) : null;
  }
  if (!siteId) {
    return { ok: false, error: appError("VALIDATION", "Site requis pour cet employé.") };
  }

  let sitePays: string | null = parsed.data.phoneCountry?.trim() ?? null;
  if (!sitePays) {
    const { loadSites } = await import("@/server/entities/load-entities");
    const siteList = await loadSites(session);
    const site = siteList.find((s) => s.id === siteId);
    sitePays = site?.pays ?? null;
  }
  const phoneNorm = normalizePhoneNumber(parsed.data.phone, sitePays);
  if (!phoneNorm.ok) {
    return { ok: false, error: appError("VALIDATION", phoneNorm.message) };
  }

  const id = parsed.data.id ?? newEntityId("emp");
  const now = new Date().toISOString();
  const hireDate = parsed.data.hireDate?.trim()
    ? new Date(parsed.data.hireDate).toISOString()
    : now;
  const email = parsed.data.email?.trim().toLowerCase() ?? "";

  const payload: Record<string, unknown> = {
    id,
    lavSiteId: siteId,
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    email: email || null,
    phone: phoneNorm.e164,
    role: parsed.data.role,
    contractType: parsed.data.contractType,
    monthlySalary:
      parsed.data.contractType === "monthly" ? (parsed.data.monthlySalary ?? 0) : null,
    ratePerVehicleType:
      parsed.data.contractType === "perVehicle"
        ? serializeVehicleCommissionRules(
            parseVehicleCommissionRules(parsed.data.ratePerVehicleType ?? {}),
          )
        : null,
    isActive: parsed.data.isActive,
    hireDate,
    createdAt: parsed.data.id && parsed.data.createdAt ? parsed.data.createdAt : now,
    updatedAt: now,
  };

  const plainPassword = parsed.data.password?.trim();
  if (plainPassword) {
    payload.passwordHash = hashPasswordEdge(plainPassword);
  } else if (!parsed.data.id && platform) {
    const needsAuth = parsed.data.role === "admin" || parsed.data.role === "manager";
    if (needsAuth) {
      payload.passwordHash = hashPasswordEdge(DEFAULT_TENANT_PASSWORD);
    }
  }

  try {
    await upsertEntityCloud("employees", payload);
    revalidatePath("/employes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("SAVE", e instanceof Error ? e.message : "Erreur") };
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }
  if (!canMutateCloud(session)) {
    return { ok: false, error: appError("FORBIDDEN", "Réservé aux administrateurs.") };
  }
  const { loadWorkspaceEntities } = await import("@/server/entities/load-entities");
  const { entities } = await loadWorkspaceEntities(session);
  const raw = ((entities.employees ?? []) as Record<string, unknown>[]).find(
    (e) => String(e.id) === employeeId,
  );
  if (!raw) {
    return { ok: false, error: appError("NOT_FOUND", "Employé introuvable.") };
  }
  if (ordersUseEmployee(entities, employeeId)) {
    return {
      ok: false,
      error: appError("DELETE", "Impossible : cet employé est lié à des commandes."),
    };
  }
  const siteId = String(raw.lavSiteId ?? raw.lav_site_id ?? "");
  try {
    await deleteEntityCloud("employees", employeeId, {
      id: employeeId,
      ...(siteId ? { lavSiteId: siteId } : {}),
    });
    revalidatePath("/employes");
    revalidatePath("/sites");
    revalidatePath(`/employes/${employeeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: appError("DELETE", e instanceof Error ? e.message : "Suppression impossible") };
  }
}

export async function resetEmployeePasswordAction(employeeId: string): Promise<Result> {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }
  if (!isPlatformUser(session)) {
    return {
      ok: false,
      error: appError("FORBIDDEN", "Réinitialisation réservée au super admin."),
    };
  }

  const { loadWorkspaceEntities } = await import("@/server/entities/load-entities");
  const { entities } = await loadWorkspaceEntities(session);
  const raw = ((entities.employees ?? []) as Record<string, unknown>[]).find(
    (e) => String(e.id) === employeeId,
  );
  if (!raw) {
    return { ok: false, error: appError("NOT_FOUND", "Employé introuvable.") };
  }

  const role = String(raw.role ?? "");
  if (role !== "admin" && role !== "manager") {
    return {
      ok: false,
      error: appError("VALIDATION", "Seuls administrateur et gérant ont un mot de passe de connexion."),
    };
  }
  const email = String(raw.email ?? "").trim();
  if (!email) {
    return { ok: false, error: appError("VALIDATION", "E-mail requis pour réinitialiser le mot de passe.") };
  }

  try {
    const payload = employeeCloudPayloadFromRaw(raw, {
      passwordHash: hashPasswordEdge(DEFAULT_TENANT_PASSWORD),
    });
    await upsertEntityCloud("employees", payload);
    revalidatePath("/employes");
    revalidatePath(`/employes/${employeeId}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: appError("SAVE", e instanceof Error ? e.message : "Réinitialisation impossible"),
    };
  }
}

export async function getEmployeeKpisAction(employeeId: string) {
  const session = await requireSessionForAction();
  if (!session) {
    return { ok: false as const, error: appError("NO_SESSION", "Session expirée.") };
  }
  const { loadWorkspaceEntities } = await import("@/server/entities/load-entities");
  const { entities } = await loadWorkspaceEntities(session);
  const raw = ((entities.employees ?? []) as Record<string, unknown>[]).find(
    (e) => String(e.id) === employeeId,
  );
  if (!raw) {
    return { ok: false as const, error: appError("NOT_FOUND", "Employé introuvable") };
  }
  const { computeEmployeeKpis } = await import("./get-employee-kpis");
  const kpis = await computeEmployeeKpis(session, raw);
  return { ok: true as const, kpis };
}