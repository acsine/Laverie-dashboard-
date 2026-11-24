import { createHash } from "crypto";
import { getSupabaseEnv } from "@/lib/supabase";

/** Aligné Edge sync-api + migration 006 (SHA-256 de « admin123 ») */
const BOOTSTRAP_SUPERADMIN_EMAIL = "superadmin@laverie.com";
const BOOTSTRAP_SUPERADMIN_HASH =
  "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

function isDefaultSuperadminPassword(email: string, password: string): boolean {
  if (email !== BOOTSTRAP_SUPERADMIN_EMAIL) return false;
  const hash = createHash("sha256").update(password).digest("hex");
  return hash === BOOTSTRAP_SUPERADMIN_HASH;
}

function defaultSuperadminProfile(email: string): PlatformProfile {
  return {
    id: "lav_puser_000001",
    email,
    firstName: "Super",
    lastName: "Admin",
    phone: "0600000000",
    isActive: true,
    kind: "platform",
    mustChangePassword: false,
    isPlatformSuperAdmin: true,
    canApproveTrial: false,
  };
}

export type SyncApiResult = Record<string, unknown>;

export async function invokeSyncApi(
  body: Record<string, unknown>,
): Promise<{ status: number; data: SyncApiResult }> {
  const { url, anonKey } = getSupabaseEnv();
  const res = await fetch(`${url}/functions/v1/sync-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: SyncApiResult = {};
  try {
    data = (await res.json()) as SyncApiResult;
  } catch {
    data = { error: "Réponse invalide du cloud" };
  }
  return { status: res.status, data };
}

export type PlatformProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  kind: "platform" | "employee";
  role?: string;
  lavSiteId?: string | null;
  mustChangePassword: boolean;
  isPlatformSuperAdmin?: boolean;
  canApproveTrial?: boolean;
};

export type CloudLoginResult =
  | { ok: true; user: PlatformProfile }
  | { ok: false; platformRejected?: boolean };

export async function cloudPlatformLogin(
  email: string,
  password: string,
): Promise<CloudLoginResult> {
  const normalized = email.trim().toLowerCase();

  const platform = await invokeSyncApi({
    action: "platform-login",
    platform_email: normalized,
    platform_password: password,
  });

  const platformRejected = platform.status === 401;

  if (platform.status === 200 && platform.data.ok === true && platform.data.user) {
    const u = platform.data.user as Record<string, unknown>;
    return {
      ok: true,
      user: {
        id: String(u.id ?? "platform"),
        email: String(u.email ?? normalized),
        firstName: String(u.firstName ?? u.first_name ?? "Super"),
        lastName: String(u.lastName ?? u.last_name ?? "Admin"),
        phone: (u.phone as string) ?? null,
        isActive: u.isActive !== false,
        kind: "platform",
        mustChangePassword: false,
        isPlatformSuperAdmin:
          u.isSuperAdmin === true ||
          u.is_super_admin === true ||
          String(u.email ?? "").toLowerCase() === BOOTSTRAP_SUPERADMIN_EMAIL,
        canApproveTrial: u.canApproveTrial === true || u.can_approve_trial === true,
      },
    };
  }

  // Table lav_platform_user absente / hash incorrect sur Supabase — seed documenté
  if (platformRejected && isDefaultSuperadminPassword(normalized, password)) {
    return { ok: true, user: defaultSuperadminProfile(normalized) };
  }

  // Fallback : admin de site (compte plateforme parfois absent / mdp changé)
  const pull = await invokeSyncApi({
    action: "sync-pull",
    email: normalized,
    password,
  });

  if (pull.status !== 200 || pull.data.error) return { ok: false, platformRejected };

  const entities = pull.data.entities as Record<string, unknown> | undefined;
  const employees = (entities?.employees as Record<string, unknown>[]) ?? [];
  const me = employees.find(
    (e) => String(e.email ?? "").toLowerCase() === normalized && e.isActive !== false,
  );
  if (!me) return { ok: false, platformRejected };

  const role = String(me.role ?? "");
  // Portail plateforme web : admin de site en secours si platform-login indisponible
  if (role !== "admin") {
    return { ok: false, platformRejected };
  }

  const lavSiteId =
    String(me.lavSiteId ?? me.lav_site_id ?? "").trim() || null;
  if (!lavSiteId) {
    return { ok: false, platformRejected };
  }

  return {
    ok: true,
    user: {
      id: String(me.id),
      email: normalized,
      firstName: String(me.firstName ?? ""),
      lastName: String(me.lastName ?? ""),
      phone: (me.phone as string) ?? null,
      isActive: true,
      kind: "employee",
      role,
      lavSiteId,
      mustChangePassword: false,
    },
  };
}
