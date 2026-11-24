import { CATALOG_KINDS, type CatalogKind } from "@/lib/catalogue-routes";
import { filterNotSoftDeleted } from "@/lib/soft-delete";
import type { SessionPayload } from "@/server/auth/session";
import type { EntityKey } from "@/server/cloud/entity-sync";
import type { CloudEntities } from "@/server/cloud/entity-sync";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";

export async function loadCatalogItem(
  session: SessionPayload,
  kind: CatalogKind,
  id: string,
  siteFilter?: string | null,
): Promise<{
  raw: Record<string, unknown> | null;
  entityKey: EntityKey;
  entities: CloudEntities;
  siteId: string | null;
}> {
  const entityKey = CATALOG_KINDS[kind].entityKey;
  const { entities, siteId } = await loadWorkspaceEntities(session, siteFilter);
  const rows = filterNotSoftDeleted(
    (entities[entityKey] ?? []) as Record<string, unknown>[],
  );
  const raw = rows.find((r) => String(r.id) === id) ?? null;
  return { raw, entityKey, entities, siteId };
}