import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { label: string; positive?: boolean };
  className?: string;
};

export function KpiCard({ label, value, icon: Icon, trend, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-softer text-primary">
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </span>
        )}
      </div>
      <p className="mt-2 text-[22px] leading-none font-bold tabular-nums text-ink sm:text-2xl">
        {value}
      </p>
      {trend && (
        <div className="mt-3">
          <Badge tone={trend.positive === false ? "danger" : "success"}>{trend.label}</Badge>
        </div>
      )}
    </div>
  );
}
