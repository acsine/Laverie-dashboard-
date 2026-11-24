"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Props = {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
};

export function SidebarBrand({ collapsed, className, onNavigate }: Props) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        "group flex min-w-0 items-center rounded-control outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary/30",
        collapsed ? "justify-center p-1" : "gap-2.5 px-1 py-0.5",
        className,
      )}
      title="Tableau de bord"
    >
      <BrandLogo
        variant="mark"
        priority
        className={cn(
          "shrink-0 object-contain transition-transform group-hover:scale-[1.02]",
          collapsed ? "h-9 w-9" : "h-10 w-10",
        )}
      />
      {!collapsed && (
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold tracking-tight text-ink">Salam Wash</p>
          <p className="truncate text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
            Laverie Admin
          </p>
        </div>
      )}
    </Link>
  );
}