/** Tokens design LAVERIE ADMIN — utilisables en JS (charts, etc.) */
export const colors = {
  primary: "#1D4ED8",
  primaryDark: "#1E3A8A",
  primaryLight: "#DBEAFE",
  primarySofter: "#EFF6FF",
  background: "#F5F8FF",
  surface: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#475569",
  border: "#E2E8F0",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#F59E0B",
  bannerFrom: "#1D4ED8",
  bannerTo: "#3B82F6",
} as const;

export const typography = {
  h1: { size: 28, weight: 700 },
  h2: { size: 20, weight: 600 },
  body: { size: 14, weight: 400 },
  caption: { size: 12, weight: 500 },
  kpi: { size: 28, weight: 700 },
} as const;

export const layout = {
  sidebarWidth: 260,
  sidebarCollapsed: 72,
  topbarHeight: 64,
  contentMaxWidth: 1280,
  pagePaddingDesktop: 24,
  pagePaddingMobile: 16,
  cardRadius: 12,
  buttonRadius: 8,
  inputHeight: 44,
  touchTarget: 44,
} as const;

export const shadow = "0 1px 3px rgba(15,23,42,0.08)";
