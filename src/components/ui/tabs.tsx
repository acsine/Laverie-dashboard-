"use client";

import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string };

type Props = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Tabs({ items, value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
