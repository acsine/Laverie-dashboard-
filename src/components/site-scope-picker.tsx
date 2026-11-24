"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SiteOption = { id: string; nom: string };

type Props = {
  sites: SiteOption[];
  currentSiteId: string | null;
  /** Super admin doit choisir un site (ex. nouvelle commande). */
  required?: boolean;
  className?: string;
};

export function SiteScopePicker({ sites, currentSiteId, required, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(siteId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!siteId || siteId === "all") params.delete("site");
    else params.set("site", siteId);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className={className}>
      <label htmlFor="site-scope" className="mb-1.5 block text-sm font-medium text-ink">
        Site {required ? <span className="text-danger">*</span> : null}
      </label>
      <select
        id="site-scope"
        className="h-11 w-full min-w-[12rem] max-w-md rounded-control border border-line bg-surface px-3 text-sm text-ink"
        value={required ? (currentSiteId ?? "") : (currentSiteId ?? "all")}
        onChange={(e) => onChange(e.target.value)}
      >
        {required ? (
          <option value="">— Choisir un site —</option>
        ) : (
          <option value="all">Tous les sites</option>
        )}
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
      {required && !currentSiteId && (
        <p className="mt-1.5 text-xs text-warning">
          Sélectionnez le site sur lequel la commande sera créée.
        </p>
      )}
    </div>
  );
}