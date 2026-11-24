/** Règles session sans API Next (importable côté client). */

export type SessionScope = {
  kind?: "platform" | "employee";
  role?: string;
  lavSiteId?: string | null;
  email?: string;
  isPlatformSuperAdmin?: boolean;
  canApproveTrial?: boolean;
};

/** Super admin plateforme (multi-sites, écritures globales). */
export function isSuperAdmin(session: SessionScope): boolean {
  const email = session.email?.trim().toLowerCase();
  if (email === "superadmin@laverie.com") return true;
  return session.kind === "platform" && session.isPlatformSuperAdmin === true;
}

/** Compte plateforme (super admin ou gestionnaire essai, etc.). */
export function isPlatformUser(session: SessionScope): boolean {
  return session.kind === "platform";
}

/** Prolongation d'essai : compte explicitement autorisé en base (`can_approve_trial`). */
export function canApproveTrialExtension(session: SessionScope): boolean {
  return session.canApproveTrial === true;
}

export function isSiteAdmin(session: SessionScope): boolean {
  return session.kind === "employee" && session.role === "admin";
}

/** Écritures cloud (employés, catalogue, commandes…) : admin site ou super admin. */
export function canDirectPush(session: SessionScope): boolean {
  return isSuperAdmin(session) || session.role === "admin";
}

/**
 * Périmètre données d'un utilisateur connecté.
 * Super admin : filtre optionnel `?site=` (sinon vue globale).
 * Employé / admin d'agence : toujours `lavSiteId` de la session (`?site=` ignoré).
 */
export function resolveSiteScope(
  session: SessionScope,
  siteFilter?: string | null,
): string | null {
  if (isPlatformUser(session)) {
    const id = siteFilter?.trim();
    return id && id !== "all" ? id : null;
  }
  const siteId = session.lavSiteId?.trim();
  return siteId || null;
}

/** Tout compte agence (employé / admin site) doit avoir un `lavSiteId` en session. */
export function userRequiresSite(session: SessionScope): boolean {
  return !isPlatformUser(session);
}

export function hasLinkedSite(session: SessionScope): boolean {
  return Boolean(session.lavSiteId?.trim());
}

/** Site du compte agence — erreur si absent. */
export function requireUserSiteId(session: SessionScope): string {
  const id = session.lavSiteId?.trim();
  if (!id) {
    throw new Error("SITE_REQUIRED");
  }
  return id;
}