import type { Prisma } from "@prisma/client";
import { newEntityId } from "@/lib/ids";
import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/supabase";
import type { SessionPayload } from "@/server/auth/session";
import { resolveSiteScope } from "@/server/auth/guards";

export type AuditWriteInput = {
  session: SessionPayload;
  action: string;
  entityType: string;
  entityId?: string;
  lavSiteId?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  if (!hasDatabaseUrl()) return;
  const siteId = input.lavSiteId ?? resolveSiteScope(input.session) ?? null;
  try {
    await db.lavAuditLog.create({
      data: {
        id: newEntityId("aud"),
        actorId: input.session.sub,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        lavSiteId: siteId,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.warn("[audit] write failed", e instanceof Error ? e.message : e);
  }
}