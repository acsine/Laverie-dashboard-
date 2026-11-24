import { getSupabase } from "@/lib/supabase";

export function parseSiteFilter(searchParams: { site?: string }): string | null {
  const id = searchParams.site?.trim();
  return id && id !== "all" ? id : null;
}

export async function loadSiteLabel(siteId: string | null): Promise<string | null> {
  if (!siteId) return null;
  const { data } = await getSupabase().from("lav_site").select("nom").eq("id", siteId).maybeSingle();
  return data?.nom ? String(data.nom) : siteId;
}