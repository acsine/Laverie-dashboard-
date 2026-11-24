import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Tableau 100 % de la largeur du conteneur (ex. modale) — pas de min-width 640px */
  fluid?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = "Aucune donnée",
  emptyDescription,
  className,
  fluid,
}: Props<T>) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-panel border border-line bg-surface p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("overflow-hidden rounded-panel border border-line bg-surface shadow-card", className)}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-left text-sm",
            fluid ? "min-w-0 table-fixed" : "min-w-[640px]",
          )}
        >
          <thead className="sticky top-0 bg-primary-softer">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "border-b border-line px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-primary-softer/50">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-ink", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
