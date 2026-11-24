import type { CloudEntities } from "@/server/cloud/entity-sync";

export function buildServiceNameMap(entities: CloudEntities): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of (entities.services ?? []) as Record<string, unknown>[]) {
    const id = String(s.id ?? "");
    if (!id) continue;
    const name = String(s.name ?? s.label ?? "").trim();
    map.set(id, name || id);
  }
  return map;
}

export function resolveServiceName(map: Map<string, string>, serviceId: string): string {
  const id = serviceId.trim();
  const fromMap = map.get(id);
  if (fromMap) return fromMap;
  return id;
}