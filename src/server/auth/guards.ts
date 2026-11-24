import { redirect } from "next/navigation";
import { appError, type AppError } from "@/lib/errors";
import {
  canApproveTrialExtension,
  canDirectPush,
  isPlatformUser,
  isSiteAdmin,
  isSuperAdmin,
  resolveSiteScope,
} from "@/lib/session-policy";
import {
  hasLinkedSite,
  userRequiresSite,
} from "@/lib/session-policy";
import { assertSessionLinkedToSite } from "@/server/auth/site-scope";
import { getSession, type SessionPayload } from "./session";
import { getEdgeCredentials } from "./edge-credentials";

export {
  canApproveTrialExtension,
  canDirectPush,
  isPlatformUser,
  isSiteAdmin,
  isSuperAdmin,
  resolveSiteScope,
};

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (userRequiresSite(session) && !hasLinkedSite(session)) {
    redirect("/login?error=site");
  }
  return session;
}

/** Compte agence : session avec site obligatoire (lève SITE_REQUIRED sinon). */
export async function requireTenantSession(): Promise<SessionPayload> {
  const session = await requireSession();
  assertSessionLinkedToSite(session);
  return session;
}

/** Server Actions uniquement — jamais de redirect (évite 307 / erreur client). */
export async function requireSessionForAction(): Promise<SessionPayload | null> {
  return getSession();
}

export function canManagePlatform(session: SessionPayload): boolean {
  return isSuperAdmin(session);
}

/** Écriture cloud : admin de site ou super admin plateforme. */
export function canMutateCloud(session: SessionPayload): boolean {
  return canDirectPush(session);
}

export async function requireEdgeCreds(): Promise<{ email: string; password: string }> {
  const creds = await getEdgeCredentials();
  if (!creds) {
    throw appError(
      "NO_CREDS",
      "Identifiants cloud absents. Déconnectez-vous puis reconnectez-vous.",
    ) as AppError;
  }
  return creds;
}

export async function requirePlatformAccess(session: SessionPayload): Promise<void> {
  if (!isPlatformUser(session) && !isSiteAdmin(session)) {
    redirect("/");
  }
}