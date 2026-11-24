import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-bold text-ink">Page introuvable</h1>
      <p className="text-sm text-muted">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-white"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
