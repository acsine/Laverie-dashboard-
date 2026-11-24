"use client";

import {
  LayoutDashboard,
  Building2,
  Timer,
  Users,
  UserRound,
  Tags,
  ShoppingCart,
  Wallet,
  CreditCard,
  RefreshCw,
  ScrollText,
  FileBarChart,
  Settings,
  Home,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { NavIconId } from "../nav-config";

const ICONS: Record<NavIconId, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  building2: Building2,
  timer: Timer,
  users: Users,
  "user-round": UserRound,
  tags: Tags,
  "shopping-cart": ShoppingCart,
  wallet: Wallet,
  "credit-card": CreditCard,
  "refresh-cw": RefreshCw,
  "scroll-text": ScrollText,
  "file-bar-chart": FileBarChart,
  settings: Settings,
  home: Home,
  "more-horizontal": MoreHorizontal,
};

type Props = {
  iconId: NavIconId;
  className?: string;
  strokeWidth?: number;
};

export function NavIcon({ iconId, className, strokeWidth = 1.75 }: Props) {
  const Icon = ICONS[iconId];
  return <Icon className={className} strokeWidth={strokeWidth} />;
}