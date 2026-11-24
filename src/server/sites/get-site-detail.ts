import { getSupabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import type { SessionPayload } from "@/server/auth/session";
import { isPlatformUser } from "@/server/auth/guards";
import { loadWorkspaceEntities } from "@/server/entities/load-entities";
import { getVue360 } from "@/server/dashboard/get-vue360";
import { roleLabel } from "@/features/employees/components/employee-labels";

export type SiteStaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
};

export type SiteRecentOrder = {
  id: string;
  statusLabel: string;
  totalLabel: string;
  createdLabel: string;
  invoiceNumber: string | null;
};

export type SiteGerantAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type SiteDetailPack = {
  site: {
    id: string;
    nom: string;
    adresse: string;
    ville: string;
    pays: string;
    telephone: string | null;
    isActive: boolean;
  };
  trial: {
    endLabel: string;
    remainingDays: number | null;
    isExpired: boolean;
    durationMonths: number | null;
  };
  staff: SiteStaffMember[];
  siteAdmins: SiteStaffMember[];
  staffCounts: { admins: number; total: number; byRole: { role: string; label: string; count: number }[] };
  kpis: {
    commandes: number;
    employes: number;
    clients: number;
    caLabel: string;
    margeLabel: string;
    periodLabel: string;
  };
  recentOrders: SiteRecentOrder[];
  alerts: { id: string; label: string; tone: "danger" | "warning" | "info" }[];
  gerantActions: SiteGerantAction[];
};

function trialFromConfig(endAt: string | null, months: number | null) {
  const now = Date.now();
  let remainingDays: number | null = null;
  let isExpired = false;
  if (endAt) {
    const end = new Date(endAt).getTime();
    remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    isExpired = now > end;
  }
  return {
    endLabel: endAt ? formatDateTime(endAt) : "—",
    remainingDays,
    isExpired,
    durationMonths: months,
  };
}

export async function getSiteDetailPack(
  session: SessionPayload,
  siteId: string,
): Promise<SiteDetailPack | null> {
  if (!isPlatformUser(session)) return null;

  const supabase = getSupabase();
  const { data: siteRow, error } = await supabase
    .from("lav_site")
    .select("*")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!siteRow) return null;

  const { data: cfg } = await supabase
    .from("lav_site_config")
    .select("trial_end_at, trial_duration_months")
    .eq("lav_site_id", siteId)
    .maybeSingle();

  const { entities } = await loadWorkspaceEntities(session, siteId);
  const { filterNotSoftDeleted } = await import("@/lib/soft-delete");
  const employees = filterNotSoftDeleted((entities.employees ?? []) as Record<string, unknown>[]);

  const staff: SiteStaffMember[] = employees
    .map((e) => {
      const first = String(e.firstName ?? e.first_name ?? "");
      const last = String(e.lastName ?? e.last_name ?? "");
      const role = String(e.role ?? "");
      return {
        id: String(e.id),
        name: `${first} ${last}`.trim() || "—",
        email: String(e.email ?? ""),
        phone: String(e.phone ?? ""),
        role,
        roleLabel: roleLabel(role),
        isActive: e.isActive !== false && e.is_active !== false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const roleCounts = new Map<string, number>();
  for (const s of staff.filter((e) => e.isActive)) {
    roleCounts.set(s.role, (roleCounts.get(s.role) ?? 0) + 1);
  }
  const byRole = Array.from(roleCounts.entries()).map(([role, count]) => ({
    role,
    label: roleLabel(role),
    count,
  }));
  const admins = staff.filter((s) => s.isActive && (s.role === "admin" || s.role === "manager"));

  const vue = await getVue360({ period: "month", siteId, isPlatform: true });
  const alerts = vue.alerts.filter(
    (a) =>
      a.id === "ok" ||
      a.id === `trial-${siteId}` ||
      a.id === "exp-pending" ||
      a.id === "batches",
  );

  const q = `?site=${encodeURIComponent(siteId)}`;
  const gerantActions: SiteGerantAction[] = [
    {
      id: "vue360",
      label: "Vue 360",
      description: "Pilotage et indicateurs",
      href: `/${q}`,
    },
  {
      id: "nouvelle-commande",
      label: "Nouvelle commande",
      description: "Comme en caisse",
      href: `/commandes/nouvelle${q}`,
    },
    { id: "commandes", label: "Commandes", description: "Suivi des dossiers", href: `/commandes${q}` },
    { id: "clients", label: "Clients", description: "Fichier client du site", href: `/clients${q}` },
    { id: "catalogue", label: "Catalogue", description: "Services et tarifs", href: `/catalogue${q}` },
    { id: "employes", label: "Employés", description: "Équipe et rôles", href: `/employes${q}` },
    { id: "finances", label: "Finances", description: "Recettes et dépenses", href: `/finances${q}` },
    { id: "essai", label: "Essai", description: "Abonnement et prolongation", href: `/essai${q}` },
    { id: "rapports", label: "Rapports", description: "Synthèse période", href: `/rapports${q}` },
    { id: "sync", label: "Synchronisation", description: "Cloud et lots", href: "/sync" },
    { id: "systeme", label: "Paramètres", description: "Compte et sécurité", href: "/systeme" },
  ];

  return {
    site: {
      id: String(siteRow.id),
      nom: String(siteRow.nom ?? ""),
      adresse: String(siteRow.adresse ?? ""),
      ville: String(siteRow.ville ?? ""),
      pays: String(siteRow.pays ?? "Cameroun"),
      telephone: siteRow.telephone ? String(siteRow.telephone) : null,
      isActive: siteRow.is_active === true,
    },
    trial: trialFromConfig(
      cfg?.trial_end_at ? String(cfg.trial_end_at) : null,
      cfg?.trial_duration_months != null ? Number(cfg.trial_duration_months) : null,
    ),
    staff,
    siteAdmins: admins,
    staffCounts: {
      admins: admins.length,
      total: staff.filter((s) => s.isActive).length,
      byRole,
    },
    kpis: {
      commandes: vue.kpis.commandes,
      employes: vue.kpis.employes,
      clients: vue.kpis.clients,
      caLabel: vue.kpis.caLabel,
      margeLabel: vue.kpis.margeLabel,
      periodLabel: "Mois en cours",
    },
    recentOrders: vue.recentOrders.slice(0, 6).map((o) => ({
      id: o.id,
      statusLabel: o.statusLabel,
      totalLabel: o.totalLabel,
      createdLabel: o.createdLabel,
      invoiceNumber: o.invoiceNumber,
    })),
    alerts: alerts.length ? alerts : [{ id: "ok", label: "Aucune alerte pour ce site", tone: "info" }],
    gerantActions,
  };
}