"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useSearchParams } from "next/navigation";
import type { NavIconId } from "../nav-config";
import { NavIcon } from "./nav-icon";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ContentProps = {
  iconId: NavIconId;
  label: string;
  showLabel?: boolean;
  iconClassName?: string;
  iconStroke?: number;
  pendingClassName?: string;
};

function AppNavLinkContent({
  iconId,
  label,
  showLabel = true,
  iconClassName = "h-[18px] w-[18px] shrink-0",
  iconStroke = 1.75,
  pendingClassName,
}: ContentProps) {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending ? (
        <Spinner className={cn(iconClassName, "text-current")} />
      ) : (
        <NavIcon iconId={iconId} className={iconClassName} strokeWidth={iconStroke} />
      )}
      {showLabel && (
        <span className={cn("min-w-0 truncate leading-tight", pending && pendingClassName)}>
          {label}
        </span>
      )}
    </>
  );
}

type Props = ContentProps & {
  href: string;
  className?: string;
  onClick?: () => void;
  title?: string;
};

export function AppNavLink({
  href,
  className,
  onClick,
  title,
  ...content
}: Props) {
  const searchParams = useSearchParams();
  const site = searchParams.get("site");
  const resolvedHref =
    site && !href.includes("site=")
      ? `${href}${href.includes("?") ? "&" : "?"}site=${encodeURIComponent(site)}`
      : href;

  return (
    <Link href={resolvedHref} onClick={onClick} title={title} className={className} prefetch>
      <AppNavLinkContent {...content} />
    </Link>
  );
}