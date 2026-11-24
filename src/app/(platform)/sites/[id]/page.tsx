import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteDetailPage } from "@/features/sites/components/site-detail-page";
import { canManagePlatform, isPlatformUser, requireSession } from "@/server/auth/guards";
import { loadSites } from "@/server/entities/load-entities";
import { getSiteDetailPack } from "@/server/sites/get-site-detail";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Site ${id}` };
}

export default async function SiteDetailRoute({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();
  if (!isPlatformUser(session)) redirect("/");

  const sites = await loadSites(session);
  const row = sites.find((s) => s.id === id);
  if (!row) notFound();

  const detail = await getSiteDetailPack(session, id);
  if (!detail) notFound();

  return (
    <SiteDetailPage
      detail={detail}
      listHref="/sites"
      editHref={`/sites?edit=${encodeURIComponent(id)}`}
      canManage={canManagePlatform(session)}
    />
  );
}