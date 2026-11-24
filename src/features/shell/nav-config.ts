import { isSuperAdmin } from "@/lib/session-policy";

export type NavIconId =
  | "layout-dashboard"
  | "building2"
  | "timer"
  | "users"
  | "user-round"
  | "tags"
  | "shopping-cart"
  | "wallet"
  | "credit-card"
  | "refresh-cw"
  | "scroll-text"
  | "file-bar-chart"
  | "settings"
  | "home"
  | "more-horizontal";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  iconId: NavIconId;
  enabled: boolean;
  platformOnly?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export type ShellSession = {
  email: string;
  kind?: "platform" | "employee";
  role?: string;
  lavSiteId?: string | null;
  firstName: string;
  lastName: string;
};

function platformSections(): NavSection[] {
  return [
    {
      id: "pilotage",
      label: "Pilotage",
      items: [
        { id: "vue360", label: "Vue 360", href: "/", iconId: "layout-dashboard", enabled: true },
        { id: "sites", label: "Sites", href: "/sites", iconId: "building2", enabled: true, platformOnly: true },
        { id: "essai", label: "Essai & abonnement", href: "/essai", iconId: "timer", enabled: true },
      ],
    },
    {
      id: "metier",
      label: "Métier",
      items: [
        { id: "employes", label: "Employés", href: "/employes", iconId: "users", enabled: true },
        { id: "clients", label: "Clients", href: "/clients", iconId: "user-round", enabled: true },
        { id: "catalogue", label: "Catalogue", href: "/catalogue", iconId: "tags", enabled: true },
        { id: "commandes", label: "Commandes", href: "/commandes", iconId: "shopping-cart", enabled: true },
      ],
    },
    {
      id: "finance",
      label: "Finances & fidélité",
      items: [
        { id: "finances", label: "Finances", href: "/finances", iconId: "wallet", enabled: true },
        { id: "fidelite", label: "Fidélité", href: "/fidelite", iconId: "credit-card", enabled: true, platformOnly: true },
      ],
    },
    {
      id: "systeme",
      label: "Système",
      items: [
        { id: "sync", label: "Synchronisation", href: "/sync", iconId: "refresh-cw", enabled: true },
        { id: "audit", label: "Audit", href: "/audit", iconId: "scroll-text", enabled: true, platformOnly: true },
        { id: "rapports", label: "Rapports", href: "/rapports", iconId: "file-bar-chart", enabled: true },
        { id: "systeme", label: "Paramètres", href: "/systeme", iconId: "settings", enabled: true },
      ],
    },
  ];
}

function agencySections(): NavSection[] {
  return [
    {
      id: "pilotage",
      label: "Pilotage",
      items: [
        { id: "vue360", label: "Vue 360", href: "/", iconId: "layout-dashboard", enabled: true },
        { id: "essai", label: "Essai", href: "/essai", iconId: "timer", enabled: true },
      ],
    },
    {
      id: "metier",
      label: "Métier",
      items: [
        { id: "employes", label: "Employés", href: "/employes", iconId: "users", enabled: true },
        { id: "clients", label: "Clients", href: "/clients", iconId: "user-round", enabled: true },
        { id: "catalogue", label: "Catalogue", href: "/catalogue", iconId: "tags", enabled: true },
        { id: "commandes", label: "Commandes", href: "/commandes", iconId: "shopping-cart", enabled: true },
      ],
    },
    {
      id: "finance",
      label: "Finances",
      items: [
        { id: "finances", label: "Finances", href: "/finances", iconId: "wallet", enabled: true },
      ],
    },
    {
      id: "systeme",
      label: "Système",
      items: [
        { id: "sync", label: "Synchronisation", href: "/sync", iconId: "refresh-cw", enabled: true },
        { id: "rapports", label: "Rapports", href: "/rapports", iconId: "file-bar-chart", enabled: true },
        { id: "systeme", label: "Paramètres", href: "/systeme", iconId: "settings", enabled: true },
      ],
    },
  ];
}

/** Menu latéral selon profil (plateforme vs admin d'agence). Sérialisable serveur → client. */
export function buildNav(session: ShellSession): NavSection[] {
  const base = isSuperAdmin(session) ? platformSections() : agencySections();
  return base.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.enabled) return false;
      if (item.platformOnly && !isSuperAdmin(session)) return false;
      return true;
    }),
  }));
}

export const mobileBottomNav: NavItem[] = [
  { id: "home", label: "Accueil", href: "/", iconId: "home", enabled: true },
  { id: "commandes", label: "Commandes", href: "/commandes", iconId: "shopping-cart", enabled: true },
  { id: "clients", label: "Clients", href: "/clients", iconId: "user-round", enabled: true },
  { id: "finances", label: "Finances", href: "/finances", iconId: "wallet", enabled: true },
  { id: "plus", label: "Plus", href: "/employes", iconId: "more-horizontal", enabled: true },
];