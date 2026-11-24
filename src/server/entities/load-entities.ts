import { getSupabase } from "@/lib/supabase";
import type { SessionPayload } from "@/server/auth/session";
import { isPlatformUser, resolveSiteScope } from "@/server/auth/guards";
import {
  filterEntitiesBySite,
  pullCloudEntities,
  type CloudEntities,
} from "@/server/cloud/entity-sync";

export async function loadWorkspaceEntities(
  session: SessionPayload,
  siteFilter?: string | null,
): Promise<{ entities: CloudEntities; siteId: string | null; remoteVersion?: number }> {
  const siteId = resolveSiteScope(session, siteFilter);
  if (!isPlatformUser(session) && !siteId) {
    throw new Error(
      "Compte non rattaché à un site. Contactez l'administrateur pour affecter une agence.",
    );
  }
  const { entities, remoteVersion } = await pullCloudEntities();
  if (siteId) {
    return { entities: filterEntitiesBySite(entities, siteId), siteId, remoteVersion };
  }
  return { entities, siteId, remoteVersion };
}

export async function loadSites(session: SessionPayload) {
  if (isPlatformUser(session)) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("lav_site").select("*").order("nom");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      nom: r.nom as string,
      adresse: (r.adresse as string) ?? "",
      ville: (r.ville as string) ?? "",
      pays: (r.pays as string) ?? "Cameroun",
      telephone: (r.telephone as string) ?? null,
      isActive: r.is_active === true,
    }));
  }
  const { entities } = await pullCloudEntities();
  const sites = await getSupabase().from("lav_site").select("*").order("nom");
  if (sites.data?.length) {
    return sites.data.map((r) => ({
      id: r.id as string,
      nom: r.nom as string,
      adresse: (r.adresse as string) ?? "",
      ville: (r.ville as string) ?? "",
      pays: (r.pays as string) ?? "Cameroun",
      telephone: (r.telephone as string) ?? null,
      isActive: r.is_active === true,
    }));
  }
  void entities;
  return [];
}