import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-accent-ink hover:bg-primary-dark shadow-card",
  secondary: "border border-line bg-surface text-ink hover:bg-primary-softer",
  ghost: "bg-transparent text-ink hover:bg-primary-softer",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-card",
};

/** Si true, pendant le chargement seul le spinner s'affiche (boutons icône). */
type Props = React.ComponentProps<"button"> & {
  variant?: Variant;
  loading?: boolean;
  iconOnly?: boolean;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  loading,
  iconOnly,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        iconOnly ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <>
            <Spinner className="h-4 w-4" />
            <span>{children}</span>
          </>
        )
      ) : (
        children
      )}
    </button>
  );
}
