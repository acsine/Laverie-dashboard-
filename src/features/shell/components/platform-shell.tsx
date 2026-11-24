"use client";

import { Suspense } from "react";
import { useShellStore } from "../store";
import type { NavSection, ShellSession } from "../nav-config";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileDrawer } from "./mobile-drawer";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";
import type { SiteOption } from "@/components/site-scope-picker";

type Props = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  siteLabel?: string | null;
  isPlatform?: boolean;
  platformSites?: SiteOption[];
  shellSession: ShellSession;
  navSections: NavSection[];
};

export function PlatformShell({
  children,
  userName,
  userEmail,
  siteLabel,
  isPlatform,
  platformSites = [],
  navSections,
}: Props) {
  const { sidebarCollapsed } = useShellStore();

  return (
    <div className="platform-density min-h-screen bg-bg">
      <Sidebar navSections={navSections} />
      <MobileDrawer navSections={navSections} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "md:pl-[var(--sidebar-collapsed)]" : "md:pl-[var(--sidebar-w)]",
        )}
      >
        <Suspense
          fallback={
            <header className="sticky top-0 z-30 h-[var(--topbar-h)] border-b border-line bg-surface/95" />
          }
        >
          <Topbar
            userName={userName}
            userEmail={userEmail}
            siteLabel={siteLabel}
            isPlatform={isPlatform}
            platformSites={platformSites}
          />
        </Suspense>
        <main
          id="contenu"
          className="w-full min-w-0 flex-1 px-4 py-4 pb-20 md:px-5 md:py-5 lg:px-6 lg:py-5 md:pb-6"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
