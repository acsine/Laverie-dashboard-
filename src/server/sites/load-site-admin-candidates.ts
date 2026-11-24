import { filterNotSoftDeleted } from "@/lib/soft-delete";
import { roleLabel } from "@/features/employees/components/employee-labels";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import type { SessionPayload } from "@/server/auth/session";

export type SiteAdminCandidate = {
  id: string;
  label: string;
  email: string;
  role: string;
  siteId: string | null;
};

const ASSIGNABLE_ROLES = new Set(["admin", "manager"]);

export async function loadSiteAdminCandidates(
  session: SessionPayload,
): Promise<SiteAdminCandidate[]> {
  const { entities } = await loadWorkspaceEntities(session);

  const siteNames = new Map<string, string>();
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const { data } = await getSupabase().from("lav_site").select("id, nom");
    for (const s of data ?? []) {
      siteNames.set(String(s.id), String(s.nom ?? s.id));
    }
  } catch {
    /* liste sites optionnelle pour libellés */
  }

  const rows = filterNotSoftDeleted((entities.employees ?? []) as Record<string, unknown>[]);
  return rows
    .filter((e) => e.isActive !== false && ASSIGNABLE_ROLES.has(String(e.role ?? "")))
    .filter((e) => String(e.email ?? "").trim().length > 0)
    .map((e) => {
      const id = String(e.id);
      const first = String(e.firstName ?? "");
      const last = String(e.lastName ?? "");
      const role = String(e.role ?? "");
      const siteId = (e.lavSiteId ?? e.lav_site_id ?? null) as string | null;
      const siteLabel = siteId
        ? siteNames.get(siteId) ?? siteId
        : "Sans site";
      const label = `${first} ${last}`.trim() + ` · ${roleLabel(role)} · ${siteLabel}`;
      return {
        id,
        label,
        email: String(e.email).toLowerCase(),
        role,
        siteId,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}