"use client";

import { SiteFilterBanner } from "@/components/site-filter-banner";
import { SiteScopePicker, type SiteOption } from "@/components/site-scope-picker";

type Props = {
  isPlatform: boolean;
  sites: SiteOption[];
  siteId: string | null;
  siteLabel?: string | null;
  /** Affiche l’avertissement si création / édition page nécessite un site sélectionné */
  requireSiteForEdit?: boolean;
  canEdit?: boolean;
  subject?: string;
  /** Afficher le sélecteur sur la page (sinon uniquement bannière + alerte) */
  showPicker?: boolean;
};

export function SiteGestionScope({
  isPlatform,
  sites,
  siteId,
  siteLabel,
  requireSiteForEdit = false,
  canEdit = false,
  subject = "ces éléments",
  showPicker = true,
}: Props) {
  return (
    <>
      {isPlatform && showPicker && (
        <SiteScopePicker sites={sites} currentSiteId={siteId ?? null} className="max-w-md" />
      )}
      {siteLabel && <SiteFilterBanner label={siteLabel} />}
      {requireSiteForEdit && canEdit && isPlatform && !siteId && (
        <p className="text-sm text-danger">
          Choisissez un site {showPicker ? "ci-dessus" : "(filtre en haut)"} pour créer ou modifier{" "}
          {subject}.
        </p>
      )}
    </>
  );
}