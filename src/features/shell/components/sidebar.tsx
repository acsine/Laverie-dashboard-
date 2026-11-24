"use client";

import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import type { NavSection } from "../nav-config";
import { NavIcon } from "./nav-icon";
import { AppNavLink } from "./app-nav-link";
import { SidebarBrand } from "./sidebar-brand";
import { useShellStore } from "../store";
import { cn } from "@/lib/utils";

type Props = { navSections: NavSection[] };

export function Sidebar({ navSections }: Props) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, setMobileNavOpen } = useShellStore();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-line bg-primary-softer transition-[width] duration-200",
        "hidden md:flex",
        sidebarCollapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-w)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-light/35 via-surface/95 to-primary-softer"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 140% 90% at 20% -10%, rgba(29, 78, 216, 0.1), transparent 55%), radial-gradient(ellipse 120% 70% at 110% 55%, rgba(59, 130, 246, 0.08), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex h-[var(--topbar-h)] shrink-0 items-center border-b border-line/60 bg-surface/40 backdrop-blur-sm",
            sidebarCollapsed ? "justify-center px-1.5" : "px-3",
          )}
        >
          <SidebarBrand collapsed={sidebarCollapsed} onNavigate={() => setMobileNavOpen(false)} />
        </div>

        <nav
          className="scrollbar-track-surface min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3"
          aria-label="Navigation principale"
        >
          {navSections.map((section) => (
            <div key={section.id} className="mb-3 last:mb-0">
              {!sidebarCollapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const iconCls = "h-[18px] w-[18px] shrink-0";

                  if (item.enabled) {
                    return (
                      <li key={item.id}>
                        <AppNavLink
                          href={item.href}
                          iconId={item.iconId}
                          label={item.label}
                          showLabel={!sidebarCollapsed}
                          iconClassName={iconCls}
                          title={sidebarCollapsed ? item.label : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={cn(
                            "relative flex w-full min-h-9 items-center gap-2 rounded-control px-2.5 text-[13px] font-medium transition-[background-color,color,box-shadow]",
                            sidebarCollapsed && "justify-center px-0",
                            active
                              ? "bg-primary text-white shadow-sm"
                              : "text-ink hover:bg-surface/80 hover:shadow-sm",
                          )}
                        />
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <span
                        title={sidebarCollapsed ? `${item.label} (bientôt)` : undefined}
                        className={cn(
                          "flex w-full min-h-9 items-center gap-2 rounded-control px-2.5 text-[13px] font-medium text-muted",
                          sidebarCollapsed ? "justify-center px-0" : "opacity-75",
                        )}
                      >
                        <NavIcon iconId={item.iconId} className={cn(iconCls, "opacity-80")} strokeWidth={1.5} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="min-w-0 flex-1 truncate leading-tight">{item.label}</span>
                            <span className="shrink-0 rounded-md bg-bg px-1.5 py-0.5 text-[9px] font-medium text-muted">
                              Bientôt
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 border-t border-line/60 bg-surface/30 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "flex w-full min-h-9 items-center justify-center gap-2 rounded-control text-[13px] text-muted transition-colors",
              "hover:bg-surface/90 hover:text-ink",
            )}
            aria-label={sidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}