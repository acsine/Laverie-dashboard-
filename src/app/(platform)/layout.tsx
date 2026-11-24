import { redirect } from "next/navigation";
import { loadSiteLabel } from "@/lib/parse-site-filter";
import { hasLinkedSite, isPlatformUser, userRequiresSite } from "@/lib/session-policy";
import { getSession } from "@/server/auth/session";
import { loadSites } from "@/server/entities/load-entities";
import { PlatformShell } from "@/features/shell/components/platform-shell";
import { buildNav } from "@/features/shell/nav-config";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (userRequiresSite(session) && !hasLinkedSite(session)) {
    redirect("/login?error=site");
  }
  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  const siteLabel = session.lavSiteId ? await loadSiteLabel(session.lavSiteId) : null;
  const isPlatform = isPlatformUser(session);
  const platformSites = isPlatform
    ? (await loadSites(session)).map((s) => ({ id: s.id, nom: s.nom }))
    : [];

  const userName = `${session.firstName} ${session.lastName}`.trim() || session.email;

  const shellSession = {
    email: session.email,
    kind: session.kind,
    role: session.role,
    lavSiteId: session.lavSiteId,
    firstName: session.firstName,
    lastName: session.lastName,
  };

  return (
    <PlatformShell
      userName={userName}
      userEmail={session.email}
      siteLabel={siteLabel}
      isPlatform={isPlatform}
      platformSites={platformSites}
      shellSession={shellSession}
      navSections={buildNav(shellSession)}
    >
      {children}
    </PlatformShell>
  );
}
