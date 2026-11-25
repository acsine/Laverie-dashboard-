"use server";

import { headers } from "next/headers";
import { appError, type AppError } from "@/lib/errors";
import { INVALID_CREDENTIALS_PUBLIC, userFacingMessage } from "@/lib/user-facing-errors";
import { loginSchema, totpSchema, changePasswordSchema } from "@/lib/validations/auth";
import { hasDatabaseUrl } from "@/lib/supabase";
import { cloudPlatformLogin } from "@/server/cloud/sync-api";
import { hashPassword, verifyPassword } from "./password";
import {
  clearSessionCookies,
  createSession,
  getSession,
  getPendingAuthSession,
  revokeSession,
  setSessionCookies,
  signAccessToken,
  type SessionPayload,
} from "./session";

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type AuthResult =
  | { ok: true; step: "done" | "totp" | "change_password"; user?: SessionPayload }
  | { ok: false; error: AppError };

async function clientMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

async function isLocked(email: string): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  const { db } = await import("@/lib/db");
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const failures = await db.lavLoginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_FAILURES;
}

async function recordAttempt(email: string, success: boolean) {
  if (!hasDatabaseUrl()) return;
  const { db } = await import("@/lib/db");
  const meta = await clientMeta();
  await db.lavLoginAttempt.create({
    data: {
      id: `lav_att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      success,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
}

async function loginViaPrisma(email: string, password: string): Promise<AuthResult | null> {
  if (!hasDatabaseUrl()) return null;
  try {
    const { db } = await import("@/lib/db");
    const user = await db.lavPlatformUser.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const { ok, needsRehash } = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await recordAttempt(email, false);
      const devHint =
        email === "superadmin@laverie.com"
          ? "Super admin : utilisez le mot de passe admin123, ou réexécutez scripts/seed-superadmin.sql dans Supabase."
          : INVALID_CREDENTIALS_PUBLIC;
      return {
        ok: false,
        error: appError(
          "INVALID_CREDENTIALS",
          userFacingMessage(devHint, INVALID_CREDENTIALS_PUBLIC),
        ),
      };
    }

    if (needsRehash) {
      await db.lavPlatformUser.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
    }

    await recordAttempt(email, true);
    await db.lavPlatformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const meta = await clientMeta();
    const totpPending = user.totpEnabled;
    const session = await createSession({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      totpPending,
      kind: "platform",
      isPlatformSuperAdmin: user.isSuperAdmin,
      canApproveTrial: user.canApproveTrial,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (totpPending) return { ok: true, step: "totp", user: session };
    if (user.mustChangePassword) return { ok: true, step: "change_password", user: session };
    return { ok: true, step: "done", user: session };
  } catch (e) {
    console.error("[loginViaPrisma]", e);
    return null;
  }
}

export async function loginAction(raw: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Données invalides"),
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  try {
    if (await isLocked(email)) {
      return {
        ok: false,
        error: appError("LOCKED", "Trop de tentatives. Réessayez dans 15 minutes."),
      };
    }

    const prismaResult = await loginViaPrisma(email, password);
    if (prismaResult) return prismaResult;

    const cloud = await cloudPlatformLogin(email, password);
    if (!cloud.ok) {
      await recordAttempt(email, false);
      const devHint =
        cloud.platformRejected && email === "superadmin@laverie.com"
          ? "Super admin : mot de passe incorrect ou compte hors seed par défaut. Essayez admin123, ou admin@laverie.com / admin123. Pour les actions cloud (fidélité plateforme), exécutez scripts/seed-superadmin.sql dans Supabase."
          : INVALID_CREDENTIALS_PUBLIC;
      return {
        ok: false,
        error: appError(
          "INVALID_CREDENTIALS",
          userFacingMessage(devHint, INVALID_CREDENTIALS_PUBLIC),
        ),
      };
    }
    const cloudUser = cloud.user;
    if (cloudUser.kind === "employee" && !cloudUser.lavSiteId?.trim()) {
      return {
        ok: false,
        error: appError(
          "NO_SITE",
          "Ce compte n'est rattaché à aucune agence. Demandez au super admin de vous affecter un site.",
        ),
      };
    }

    await recordAttempt(email, true);
    const meta = await clientMeta();
    const { setEdgeCredentials } = await import("./edge-credentials");
    await setEdgeCredentials(email, password);
    const session = await createSession({
      userId: cloudUser.id,
      email: cloudUser.email,
      firstName: cloudUser.firstName,
      lastName: cloudUser.lastName,
      mustChangePassword: cloudUser.mustChangePassword,
      kind: cloudUser.kind,
      role: cloudUser.role,
      lavSiteId: cloudUser.lavSiteId,
      isPlatformSuperAdmin: cloudUser.isPlatformSuperAdmin,
      canApproveTrial: cloudUser.canApproveTrial,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { ok: true, step: "done", user: session };
  } catch (e) {
    console.error("[loginAction]", e);
    return {
      ok: false,
      error: appError(
        "SERVER",
        "Impossible de se connecter au cloud. Vérifiez la configuration Supabase.",
      ),
    };
  }
}

export async function verifyTotpAction(raw: unknown): Promise<AuthResult> {
  const parsed = totpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Code invalide"),
    };
  }

  const jarSession = await getPendingAuthSession();
  if (!jarSession?.totpPending) {
    return { ok: false, error: appError("NO_SESSION", "Session 2FA expirée. Reconnectez-vous.") };
  }

  const accessToken = await signAccessToken({
    ...jarSession,
    totpPending: false,
  });
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const refresh = cookieStore.get("lav_refresh")?.value;
  if (refresh) {
    await setSessionCookies(accessToken, refresh);
  }

  if (jarSession.mustChangePassword) {
    return { ok: true, step: "change_password", user: { ...jarSession, totpPending: false } };
  }
  return { ok: true, step: "done", user: { ...jarSession, totpPending: false } };
}

export async function changePasswordAction(raw: unknown): Promise<AuthResult> {
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError("VALIDATION", parsed.error.issues[0]?.message ?? "Données invalides"),
    };
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, error: appError("NO_SESSION", "Session expirée.") };
  }

  if (!hasDatabaseUrl()) {
    const { changePasswordCloud } = await import("./change-password-cloud");
    const cloud = await changePasswordCloud(
      session,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    if (!cloud.ok) {
      return { ok: false, error: cloud.error };
    }
    return {
      ok: true,
      step: "done",
      user: { ...session, mustChangePassword: false },
    };
  }

  const { db } = await import("@/lib/db");
  const user = await db.lavPlatformUser.findUnique({ where: { id: session.sub } });
  if (!user) {
    return { ok: false, error: appError("NO_USER", "Utilisateur introuvable.") };
  }

  const check = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!check.ok) {
    return { ok: false, error: appError("INVALID_PASSWORD", "Mot de passe actuel incorrect.") };
  }

  await db.lavPlatformUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });

  const accessToken = await signAccessToken({
    ...session,
    mustChangePassword: false,
  });
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const refresh = cookieStore.get("lav_refresh")?.value;
  if (refresh) {
    await setSessionCookies(accessToken, refresh);
  }

  return {
    ok: true,
    step: "done",
    user: { ...session, mustChangePassword: false },
  };
}

export async function logoutAction(): Promise<{ ok: true }> {
  const session = await getPendingAuthSession();
  if (session?.sid) {
    try {
      await revokeSession(session.sid);
    } catch {
      /* ignore */
    }
  }
  const { clearEdgeCredentials } = await import("./edge-credentials");
  await clearEdgeCredentials();
  await clearSessionCookies();
  return { ok: true };
}

export async function getCurrentUserAction(): Promise<SessionPayload | null> {
  return getSession();
}
