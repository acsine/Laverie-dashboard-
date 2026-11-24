import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

export default async function SystemeRoute() {
  const session = await requireSession();
  return (
    <SettingsPage
      email={session.email}
      role={session.role ?? "—"}
      kind={session.kind ?? "employee"}
      lavSiteId={session.lavSiteId ?? null}
    />
  );
}