export function SiteFilterBanner({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted">
      Filtre site : <strong className="text-ink">{label}</strong>
    </p>
  );
}