"use client";

import { usePathname } from "next/navigation";
import { mobileBottomNav } from "../nav-config";
import { NavIcon } from "./nav-icon";
import { AppNavLink } from "./app-nav-link";
import { useShellStore } from "../store";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const { setMobileNavOpen } = useShellStore();

  return (
    <>
      <button
        type="button"
        className="fixed right-4 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-card md:hidden"
        aria-label="Nouveau"
        title="Bientôt disponible"
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-line bg-surface md:hidden">
        {mobileBottomNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          if (item.id === "plus") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted"
              >
                <NavIcon iconId={item.iconId} className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </button>
            );
          }
          if (!item.enabled) {
            return (
              <span
                key={item.id}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted opacity-50"
              >
                <NavIcon iconId={item.iconId} className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </span>
            );
          }
          return (
            <AppNavLink
              key={item.id}
              href={item.href}
              iconId={item.iconId}
              label={item.label}
              iconClassName="h-5 w-5"
              iconStroke={1.5}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            />
          );
        })}
      </nav>
    </>
  );
}
