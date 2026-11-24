import { formatDate } from "@/lib/format";
import { hasDatabaseUrl } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/server/auth/session";
import { isPlatformUser, resolveSiteScope } from "@/server/auth/guards";

export type AuditRow = {
  id: string;
  action: string;
  actor: string;
  siteId: string | null;
  createdAt: string;
  details: string;
};

export type AuditLoadResult = {
  rows: AuditRow[];
  loadError?: string;
};

function mapPayloadDetails(
  entityType: string,
  entityId: string | null | undefined,
  payload: unknown,
): string {
  const parts = [entityType, entityId].filter(Boolean);
  if (payload && typeof payload === "object") {
    parts.push(JSON.stringify(payload));
  } else if (payload) {
    parts.push(String(payload));
  }
  const text = parts.join(" · ");
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

function mapPrismaRow(r: {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  lavSiteId: string | null;
  payload: unknown;
  createdAt: Date;
}): AuditRow {
  return {
    id: r.id,
    action: r.action,
    actor: r.actorId,
    siteId: r.lavSiteId,
    createdAt: formatDate(r.createdAt.toISOString()),
    details: mapPayloadDetails(r.entityType, r.entityId, r.payload),
  };
}

function mapSupabaseRow(r: Record<string, unknown>): AuditRow {
  const entityType = String(r.entity_type ?? r.entityType ?? "");
  const entityId = r.entity_id != null ? String(r.entity_id) : null;
  return {
    id: String(r.id),
    action: String(r.action ?? r.event_type ?? "—"),
    actor: String(r.actor_email ?? r.actor_id ?? "—"),
    siteId: r.lav_site_id ? String(r.lav_site_id) : null,
    createdAt: formatDate(String(r.created_at ?? "")),
    details: mapPayloadDetails(
      entityType,
      entityId,
      r.details ?? r.payload,
    ),
  };
}

export async function loadAuditLog(
  session: SessionPayload,
  siteFilter?: string | null,
  limit = 200,
): Promise<AuditLoadResult> {
  const siteId = resolveSiteScope(session, siteFilter);
  const siteScoped = Boolean(siteId);
  const restrictToSite = siteScoped && (!isPlatformUser(session) || siteFilter);

  if (hasDatabaseUrl()) {
    try {
      const rows = await db.lavAuditLog.findMany({
        where: restrictToSite ? { lavSiteId: siteId } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return { rows: rows.map(mapPrismaRow) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lecture audit impossible";
      return { rows: [], loadError: msg };
    }
  }

  const supabase = getSupabase();
  let query = supabase
    .from("lav_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (restrictToSite) {
    query = query.eq("lav_site_id", siteId);
  }
  const { data, error } = await query;
  if (error) {
    return {
      rows: [],
      loadError:
        `${error.message} — exécutez scripts/audit-rls-anon-read.sql sur Supabase (RLS bloque la lecture anon).`,
    };
  }
  return { rows: (data ?? []).map((r) => mapSupabaseRow(r as Record<string, unknown>)) };
}