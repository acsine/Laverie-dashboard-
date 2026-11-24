"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/auth/login";

type Props = {
  userName: string;
  userEmail: string;
  siteLabel?: string | null;
  isPlatform?: boolean;
};

export function UserProfileMenu({ userName, userEmail, siteLabel, isPlatform }: Props) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const initials = userName.trim().slice(0, 1).toUpperCase() || "?";
  const scopeLine = isPlatform
    ? "Super admin · multi-sites"
    : siteLabel
      ? `Agence : ${siteLabel}`
      : null;

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onLogout() {
    startTransition(async () => {
      await logoutAction();
      setOpen(false);
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          "flex h-9 max-w-[10rem] items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-1 text-left outline-none sm:max-w-[12rem] sm:gap-1.5 sm:px-1.5",
          "hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary/25",
          open && "bg-surface",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Profil : ${userName}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary-dark">
          {initials}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-medium text-ink">{userName}</span>
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 shrink-0 text-muted transition-transform sm:block",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+6px)] right-0 z-50 w-[min(calc(100vw-1.5rem),17.5rem)] rounded-panel border border-line bg-surface p-3 shadow-lg"
        >
          <div className="border-b border-line pb-3">
            <p className="text-sm font-semibold text-ink">{userName}</p>
            <p className="mt-0.5 break-all text-xs text-muted">{userEmail}</p>
            {scopeLine && (
              <p className="mt-1.5 text-xs font-medium text-primary">{scopeLine}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            aria-busy={pending}
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-control px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? (
              <Spinner className="h-4 w-4 text-danger" />
            ) : (
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            )}
            {pending ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      )}
    </div>
  );
}