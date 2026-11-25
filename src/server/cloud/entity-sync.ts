import { createHash } from "crypto";
import { catalogRowMatchesSite, isCatalogEntityKey } from "@/lib/catalogue-scope";
import { appError, type AppError } from "@/lib/errors";
import { userFacingMessage } from "@/lib/user-facing-errors";
import { getEdgeCredentials } from "@/server/auth/edge-credentials";
import { invokeSyncApi } from "./sync-api";

export type EntityKey =
  | "employees"
  | "customers"
  | "vehicle_categories"
  | "vehicle_types"
  | "vehicles"
  | "service_categories"
  | "services"
  | "pricing"
  | "orders"
  | "revenues"
  | "expenses"
  | "lav_fidelite_programme"
  | "lav_fidelite_carte";

export type SyncChange = {
  entity_type: string;
  entity_id: string;
  action: "UPSERT" | "DELETE";
  payload: Record<string, unknown>;
};

export type CloudEntities = Partial<Record<EntityKey, Record<string, unknown>[]>>;

export function hashPasswordEdge(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function siteIdOf(row: Record<string, unknown>): string | null {
  const v = row.lavSiteId ?? row.lav_site_id;
  return v ? String(v) : null;
}

export function filterEntitiesBySite(
  entities: CloudEntities,
  lavSiteId: string,
): CloudEntities {
  const global: EntityKey[] = [
    "customers",
    "vehicles",
    "lav_fidelite_programme",
    "lav_fidelite_carte",
  ];
  const out: CloudEntities = {};
  for (const [key, rows] of Object.entries(entities)) {
    if (!rows) continue;
    if (global.includes(key as EntityKey)) {
      out[key as EntityKey] = rows;
      continue;
    }
    if (isCatalogEntityKey(key)) {
      out[key as EntityKey] = rows.filter((r) => catalogRowMatchesSite(r, lavSiteId));
      continue;
    }
    out[key as EntityKey] = rows.filter((r) => siteIdOf(r) === lavSiteId);
  }
  return out;
}

export type CloudPullMeta = {
  appConfig: Record<string, unknown>;
  pendingBatches: Record<string, unknown>[];
  remoteVersion: number;
  lavSiteId: string | null;
};

export async function pullCloudSnapshot(): Promise<
  CloudPullMeta & { entities: CloudEntities }
> {
  const creds = await getEdgeCredentials();
  if (!creds) {
    throw new Error("Identifiants cloud absents. Reconnectez-vous.");
  }

  const pull = await invokeSyncApi({
    action: "sync-pull",
    email: creds.email,
    password: creds.password,
  });

  if (pull.status !== 200 || pull.data.error) {
    throw new Error(String(pull.data.error ?? "Impossible de charger les données cloud."));
  }

  const entities = (pull.data.entities ?? {}) as CloudEntities;
  const appConfig = (pull.data.app_config ?? {}) as Record<string, unknown>;
  const remoteVersion = Number(
    (pull.data.remote_version as number | undefined) ??
      (appConfig.remote_version as number | undefined) ??
      0,
  );
  return {
    entities,
    appConfig,
    pendingBatches: (pull.data.pending_batches ?? []) as Record<string, unknown>[],
    remoteVersion,
    lavSiteId: (pull.data.lav_site_id as string | null) ?? null,
  };
}

export async function pullCloudEntities(): Promise<{
  entities: CloudEntities;
  remoteVersion?: number;
}> {
  const snap = await pullCloudSnapshot();
  return { entities: snap.entities, remoteVersion: snap.remoteVersion };
}

export function toPushChange(
  entityType: string,
  payload: Record<string, unknown>,
  action: "UPSERT" | "DELETE" = "UPSERT",
): SyncChange {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("id entité requis");
  return {
    entity_type: entityType,
    entity_id: id,
    action,
    payload,
  };
}

export async function pushCloudChanges(changes: SyncChange[]): Promise<void> {
  const creds = await getEdgeCredentials();
  if (!creds) throw new Error("Reconnectez-vous pour enregistrer.");

  const body = {
    action: "sync-push-direct",
    email: creds.email,
    password: creds.password,
    platform_email: creds.email,
    platform_password: creds.password,
    changes: changes.map((c) => ({
      entity_type: c.entity_type,
      entity_id: c.entity_id,
      action: c.action,
      payload: c.payload,
    })),
  };

  const res = await invokeSyncApi(body);
  if (res.status !== 200 || res.data.ok !== true) {
    const raw = String(res.data.error ?? "");
    if (raw === "Non autorise") {
      throw new Error(
        userFacingMessage(
          "Cloud refuse l’écriture super admin : redéployez sync-api (correctif sync-push-direct) puis reconnectez-vous. Si le mot de passe a changé, utilisez le mot de passe actuel à la connexion.",
          "Synchronisation refusée. Reconnectez-vous avec un compte autorisé.",
        ),
      );
    }
    throw new Error(
      userFacingMessage(
        raw || "Synchronisation refusée (rôle admin requis).",
        "Synchronisation refusée. Reconnectez-vous avec un compte autorisé.",
      ),
    );
  }
}

export async function upsertEntityCloud(
  entityType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await pushCloudChanges([toPushChange(entityType, payload, "UPSERT")]);
}

/** DELETE cloud : hard delete catalogue + employés (sync-api) ; soft delete clients / véhicules clients. */
export async function deleteEntityCloud(
  entityType: string,
  id: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await pushCloudChanges([
    toPushChange(entityType, { id, ...payload }, "DELETE"),
  ]);
}

export async function softDeleteEntityCloud(
  entityType: EntityKey,
  id: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await deleteEntityCloud(entityType, id, payload);
}