"use client";

import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { NavSection } from "../nav-config";
import { NavIcon } from "./nav-icon";
import { AppNavLink } from "./app-nav-link";
import { SidebarBrand } from "./sidebar-brand";
import { useShellStore } from "../store";
import { cn } from "@/lib/utils";

type Props = { navSections: NavSection[] };

export function MobileDrawer({ navSections }: Props) {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useShellStore();

  if (!mobileNavOpen) return null;

  function close() {
    setMobileNavOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Fermer le menu"
        onClick={close}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(100%,288px)] flex-col border-r border-line bg-surface shadow-card">
        <div className="flex h-[var(--topbar-h)] items-center gap-2 border-b border-line px-3">
          <SidebarBrand className="flex-1" onNavigate={close} />
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-muted hover:bg-primary-softer"
            onClick={close}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigation mobile">
          {navSections.map((section) => (
            <div key={section.id} className="mb-3">
              <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  if (!item.enabled) {
                    return (
                      <li key={item.id}>
                        <span className="flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-sm text-muted opacity-70">
                          <NavIcon iconId={item.iconId} className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="shrink-0 text-[10px]">Bientôt</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id}>
                      <AppNavLink
                        href={item.href}
                        iconId={item.iconId}
                        label={item.label}
                        iconClassName="h-5 w-5 shrink-0"
                        iconStroke={1.5}
                        onClick={close}
                        className={cn(
                          "flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-sm font-medium",
                          active ? "bg-primary text-white shadow-sm" : "text-ink hover:bg-primary-softer",
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}