"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const tones = {
  primary: "text-primary hover:bg-primary/10",
  danger: "text-danger hover:bg-danger/10",
  neutral: "text-ink hover:bg-primary-softer",
} as const;

type Tone = keyof typeof tones;
type Size = "sm" | "md";

const sizes: Record<Size, { btn: string; icon: string }> = {
  md: { btn: "h-9 w-9", icon: "h-4 w-4" },
  sm: { btn: "h-8 w-8", icon: "h-3.5 w-3.5" },
};

type ContentProps = {
  icon: LucideIcon;
  size: Size;
  iconStroke: number;
};

function IconActionLinkContent({ icon: Icon, size, iconStroke }: ContentProps) {
  const { pending } = useLinkStatus();
  const dim = sizes[size];
  if (pending) {
    return <Spinner className={dim.icon} />;
  }
  return <Icon className={dim.icon} strokeWidth={iconStroke} />;
}

type Props = {
  href: string;
  icon: LucideIcon;
  tone?: Tone;
  size?: Size;
  iconStroke?: number;
  className?: string;
  title?: string;
  "aria-label"?: string;
  onClick?: () => void;
};

export function IconActionLink({
  href,
  icon,
  tone = "primary",
  size = "md",
  iconStroke = 1.5,
  className,
  ...props
}: Props) {
  const dim = sizes[size];
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control",
        dim.btn,
        tones[tone],
        className,
      )}
      {...props}
    >
      <IconActionLinkContent icon={icon} size={size} iconStroke={iconStroke} />
    </Link>
  );
}