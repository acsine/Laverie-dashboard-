"use client";

type SeriesItem = { label: string; value: number };

export function MiniBarChart({
  items,
  valueSuffix = "",
}: {
  items: SeriesItem[];
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{i.label}</span>
            <span className="tabular-nums font-medium text-ink">
              {i.value}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-softer">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((i.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusDonut({ items }: { items: SeriesItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    return <p className="text-sm text-muted">Aucune activité sur la période.</p>;
  }
  const tones = ["bg-primary", "bg-success", "bg-warning", "bg-muted"];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-8 border-line bg-surface text-center"
        aria-hidden
      >
        <span className="text-lg font-bold text-ink">{total}</span>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {items.map((i, idx) => (
          <li key={i.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${tones[idx % tones.length]}`} />
              {i.label}
            </span>
            <span className="tabular-nums font-semibold">
              {i.value} ({Math.round((i.value / total) * 100)} %)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}