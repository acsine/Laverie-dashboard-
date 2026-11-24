"use client";

import { Menu, Bell, Search, Building2 } from "lucide-react";
import { useShellStore } from "../store";
import { useSearchParams } from "next/navigation";
import { SiteScopePicker, type SiteOption } from "@/components/site-scope-picker";
import { UserProfileMenu } from "./user-profile-menu";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  userEmail: string;
  siteLabel?: string | null;
  isPlatform?: boolean;
  platformSites?: SiteOption[];
};

export function Topbar({ userName, userEmail, siteLabel, isPlatform, platformSites = [] }: Props) {
  const { setMobileNavOpen } = useShellStore();
  const searchParams = useSearchParams();
  const scopedSiteId = searchParams.get("site");

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur-md md:gap-3 md:px-5">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink hover:bg-primary-softer md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-sm lg:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
          <input
            type="search"
            placeholder="Rechercher…"
            aria-label="Recherche globale"
            className="h-9 w-full rounded-control border border-line/90 bg-bg/80 pr-3 pl-9 text-sm outline-none placeholder:text-muted/80 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
            disabled
          />
        </div>

        {isPlatform && platformSites.length > 0 && (
          <SiteScopePicker
            sites={platformSites}
            currentSiteId={scopedSiteId}
            className="topbar-site-scope w-[min(40vw,8.5rem)] shrink-0 sm:w-44 lg:w-52 [&_label]:sr-only [&_label]:mb-0 [&_select]:!h-9 [&_select]:py-1"
          />
        )}

        {!isPlatform && siteLabel && (
          <div
            className="hidden min-w-0 max-w-[11rem] items-center gap-1.5 rounded-control border border-line/80 bg-primary-softer/60 px-2.5 py-1.5 md:flex lg:max-w-xs"
            title={siteLabel}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
            <span className="truncate text-xs font-medium text-ink">{siteLabel}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "ml-auto flex shrink-0 items-center gap-0.5 rounded-control border border-line/70 bg-bg/60 p-0.5",
          "sm:gap-1 sm:p-1",
        )}
      >
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-[calc(var(--radius-control)-2px)] text-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-bg/80" />
        </button>

        <div className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />

        <UserProfileMenu
          userName={userName}
          userEmail={userEmail}
          siteLabel={siteLabel}
          isPlatform={isPlatform}
        />
      </div>
    </header>
  );
}