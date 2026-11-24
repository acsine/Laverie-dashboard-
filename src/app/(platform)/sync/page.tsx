import type { Metadata } from "next";
import { SyncPage } from "@/features/sync/components/sync-page";
import { canDirectPush, requireSession } from "@/server/auth/guards";
import { pullCloudSnapshot } from "@/server/cloud/entity-sync";

export const metadata: Metadata = { title: "Sync" };
export const dynamic = "force-dynamic";

export default async function SyncRoute() {
  const session = await requireSession();
  const snap = await pullCloudSnapshot();
  const batches = snap.pendingBatches.map((b) => ({
    id: String(b.id ?? ""),
    createdAt: String(b.created_at ?? b.createdAt ?? "—"),
    changesCount: Array.isArray(b.changes) ? b.changes.length : Number(b.change_count ?? 0),
  }));

  return (
    <SyncPage remoteVersion={snap.remoteVersion} batches={batches} canApprove={canDirectPush(session)} />
  );
}