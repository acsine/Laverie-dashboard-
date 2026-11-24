"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const tones = {
  primary: "text-primary hover:bg-primary/10",
  danger: "text-danger hover:bg-danger/10 disabled:opacity-50",
  neutral: "text-ink hover:bg-primary-softer",
} as const;

type Tone = keyof typeof tones;
type Size = "sm" | "md";

const sizes: Record<Size, { btn: string; icon: string }> = {
  md: { btn: "h-9 w-9", icon: "h-4 w-4" },
  sm: { btn: "h-8 w-8", icon: "h-3.5 w-3.5" },
};

type Props = Omit<React.ComponentProps<"button">, "children"> & {
  icon: LucideIcon;
  loading?: boolean;
  tone?: Tone;
  size?: Size;
  iconStroke?: number;
};

export function IconActionButton({
  icon: Icon,
  loading = false,
  tone = "primary",
  size = "md",
  iconStroke = 1.5,
  className,
  disabled,
  type = "button",
  ...props
}: Props) {
  const dim = sizes[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control",
        dim.btn,
        tones[tone],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner className={dim.icon} />
      ) : (
        <Icon className={dim.icon} strokeWidth={iconStroke} />
      )}
    </button>
  );
}