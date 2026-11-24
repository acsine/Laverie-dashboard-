import { db } from "@/lib/db";

/**
 * Incrémente remote_version pour que le mobile récupère les changements au prochain sync-pull.
 * Preferer lav_site_config si siteId fourni, sinon app_config global.
 */
export async function bumpRemoteVersion(siteId?: string | null) {
  if (siteId) {
    await db.lavSiteConfig.update({
      where: { lavSiteId: siteId },
      data: { remoteVersion: { increment: 1 } },
    });
    return;
  }

  await db.appConfig.update({
    where: { id: "default" },
    data: { remoteVersion: { increment: 1 } },
  });
}
