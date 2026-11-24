"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  id?: string;
  /** floating = label dans le champ ; stacked = label au-dessus (plus lisible) */
  labelMode?: "floating" | "stacked";
};

export function Input({
  label,
  error,
  className,
  id,
  type = "text",
  labelMode = "stacked",
  ...props
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  if (labelMode === "stacked") {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            type={resolvedType}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors",
              "placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20",
              "aria-[invalid=true]:border-danger",
              isPassword && "pr-11",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-muted hover:bg-primary-softer hover:text-ink"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "peer h-11 w-full rounded-control border border-line bg-surface px-3 pt-4 pb-1 text-sm text-ink outline-none transition-colors",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "aria-[invalid=true]:border-danger",
            isPassword && "pr-11",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 origin-left -translate-y-1/2 text-sm text-muted transition-all",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:scale-90 peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-90",
          )}
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-muted hover:bg-primary-softer hover:text-ink"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
