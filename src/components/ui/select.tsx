"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function Select({
  label,
  options,
  value,
  onChange,
  error,
  name,
  disabled,
  className,
  id,
}: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "aria-[invalid=true]:border-danger disabled:opacity-50",
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
