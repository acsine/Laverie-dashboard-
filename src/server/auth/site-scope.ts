import type { SessionPayload } from "@/server/auth/session";
import {
  hasLinkedSite,
  isPlatformUser,
  requireUserSiteId,
  resolveSiteScope,
  userRequiresSite,
} from "@/lib/session-policy";
import { parseSiteFilter } from "@/lib/parse-site-filter";

/** Site effectif pour une page (super admin : `?site=` ; employé : toujours son site). */
export function effectiveSiteId(
  session: SessionPayload,
  searchParams?: { site?: string } | null,
): string | null {
  return resolveSiteScope(session, searchParams ? parseSiteFilter(searchParams) : undefined);
}

export function entityBelongsToSessionSite(
  session: SessionPayload,
  entitySiteId: string | null | undefined,
): boolean {
  if (isPlatformUser(session)) return true;
  const mine = requireUserSiteId(session);
  const row = entitySiteId != null ? String(entitySiteId).trim() : "";
  return row === mine;
}

/** Bloque l’accès si un compte agence n’a pas de site en session. */
export function assertSessionLinkedToSite(session: SessionPayload): void {
  if (userRequiresSite(session) && !hasLinkedSite(session)) {
    throw new Error("SITE_REQUIRED");
  }
}

/**
 * Site d’écriture : agence = toujours son site ; super admin = site explicite ou filtre courant.
 */
export function resolveMutationSiteId(
  session: SessionPayload,
  explicitSiteId?: string | null,
): string | null {
  if (!isPlatformUser(session)) {
    return requireUserSiteId(session);
  }
  const fromClient = explicitSiteId?.trim();
  if (fromClient) return fromClient;
  return resolveSiteScope(session);
}