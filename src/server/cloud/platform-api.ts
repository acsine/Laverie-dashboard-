import { appError, type AppError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import { getEdgeCredentials } from "@/server/auth/edge-credentials";
import { invokeSyncApi } from "./sync-api";

async function platformCreds() {
  const creds = await getEdgeCredentials();
  if (!creds) throw appError("NO_CREDS", "Reconnectez-vous (compte plateforme).");
  return creds;
}

function withPlatformAuth(
  creds: { email: string; password: string },
  body: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...body,
    platform_email: creds.email,
    platform_password: creds.password,
    email: creds.email,
    password: creds.password,
  };
}

function platformErrorMessage(code: string, status: number, raw: string): AppError {
  if (status === 401 && raw === "Non autorise") {
    return appError(
      code,
      "Edge sync-api introuvable ou trop ancienne (action plateforme absente). Redéployez supabase/functions/sync-api depuis gestion-manager.",
    );
  }
  if (status === 401 && raw.toLowerCase().includes("plateforme")) {
    return appError(
      code,
      "Compte plateforme refusé. Exécutez scripts/seed-superadmin.sql dans Supabase, puis reconnectez-vous (superadmin@laverie.com / admin123).",
    );
  }
  return appError(code, raw || "Opération plateforme refusée");
}

async function siteUpsertViaRest(site: Record<string, unknown>): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const row = {
      id: String(site.id),
      nom: String(site.nom ?? ""),
      adresse: String(site.adresse ?? ""),
      ville: String(site.ville ?? ""),
      pays: String(site.pays ?? "Cameroun"),
      telephone: (site.telephone as string | null) ?? null,
      is_active: site.isActive !== false,
      updated_at: now,
      created_at: (site.createdAt as string) ?? now,
    };
    const { error } = await supabase.from("lav_site").upsert(row, { onConflict: "id" });
    if (error) return false;
    await supabase
      .from("app_config")
      .update({ updated_at: now })
      .eq("id", "default");
    return true;
  } catch {
    return false;
  }
}

export async function platformSiteUpsert(site: Record<string, unknown>): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "platform-site-upsert",
      site,
    }),
  );
  if (res.status === 200 && res.data.ok === true) return;

  const msg = String(res.data.error ?? "");
  if (res.status === 401) {
    const login = await invokeSyncApi(
      withPlatformAuth(creds, { action: "platform-login" }),
    );
    if (login.status !== 200) {
      throw platformErrorMessage("SITE_SAVE", res.status, msg);
    }
    const retry = await invokeSyncApi(
      withPlatformAuth(creds, { action: "platform-site-upsert", site }),
    );
    if (retry.status === 200 && retry.data.ok === true) return;
  }

  if (await siteUpsertViaRest(site)) return;

  throw platformErrorMessage("SITE_SAVE", res.status, msg);
}

export async function platformCreateSiteAdmin(params: {
  siteId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "manager";
}): Promise<void> {
  const creds = await platformCreds();
  const now = new Date().toISOString();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "platform-employee-admin-create",
      employee: {
        id: params.employeeId,
        lavSiteId: params.siteId,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email.trim().toLowerCase(),
        phone: params.phone,
        role: params.role,
        contractType: "monthly",
        hireDate: now,
        createdAt: now,
        isActive: true,
      },
      admin_password: params.password,
    }),
  );
  if (res.status !== 200 || !res.data.ok) {
    throw platformErrorMessage(
      "ADMIN_CREATE",
      res.status,
      String(res.data.error ?? "Création du responsable refusée"),
    );
  }
}

/** Affecte un employé existant au site et le promeut administrateur (compte + mot de passe déjà dans Employés). */
export async function platformAssignEmployeeAsSiteAdmin(
  employeeId: string,
  siteId: string,
): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "platform-employee-assign-site",
      employee_id: employeeId,
      site_id: siteId,
      make_admin: true,
    }),
  );
  if (res.status !== 200 || !res.data.ok) {
    throw platformErrorMessage(
      "ASSIGN_ADMIN",
      res.status,
      String(res.data.error ?? "Affectation administrateur refusée"),
    );
  }
}

export async function platformSiteDelete(siteId: string): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "platform-site-delete",
      site_id: siteId,
    }),
  );
  if (res.status === 409) {
    throw appError("SITE_DELETE", "Site lié à des données — suppression impossible.");
  }
  if (res.status !== 200 || !res.data.ok) {
    throw platformErrorMessage(
      "SITE_DELETE",
      res.status,
      String(res.data.error ?? "Suppression refusée"),
    );
  }
}

export async function platformPull(lavSiteId?: string | null) {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "platform-pull",
      lav_site_id: lavSiteId ?? null,
      period: "month",
    }),
  );
  if (res.status !== 200) {
    throw platformErrorMessage(
      "PLATFORM_PULL",
      res.status,
      String(res.data.error ?? "Lecture plateforme refusée"),
    );
  }
  return res.data;
}

export async function trialRequestExtension(): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "trial-request-extension",
    }),
  );
  if (res.status !== 200 || !res.data.ok) {
    throw appError("TRIAL", String(res.data.error ?? "Demande refusée"));
  }
}

export async function trialApproveExtension(
  months: number,
  lavSiteId?: string | null,
): Promise<void> {
  const creds = await platformCreds();
  const body: Record<string, unknown> = {
    action: "trial-approve-extension",
    months,
  };
  if (lavSiteId?.trim()) body.lav_site_id = lavSiteId.trim();
  const res = await invokeSyncApi(withPlatformAuth(creds, body));
  if (res.status !== 200 || !res.data.ok) {
    const resAdmin = await invokeSyncApi(withPlatformAuth(creds, body));
    if (resAdmin.status !== 200 || !resAdmin.data.ok) {
      throw platformErrorMessage(
        "TRIAL",
        res.status,
        String(resAdmin.data.error ?? "Extension refusée"),
      );
    }
  }
}

export async function syncApproveBatch(batchId: string): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "sync-approve-batch",
      batch_id: batchId,
    }),
  );
  if (res.status !== 200 || !res.data.ok) {
    throw platformErrorMessage(
      "SYNC",
      res.status,
      String(res.data.error ?? "Approbation impossible"),
    );
  }
}

export async function syncPushPending(changes: Record<string, unknown>[]): Promise<void> {
  const creds = await platformCreds();
  const res = await invokeSyncApi(
    withPlatformAuth(creds, {
      action: "sync-push-pending",
      changes,
    }),
  );
  if (res.status !== 200 || !res.data.ok) {
    throw platformErrorMessage(
      "SYNC",
      res.status,
      String(res.data.error ?? "Envoi file d'attente refusé"),
    );
  }
}