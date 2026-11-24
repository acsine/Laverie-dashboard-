import { getSupabase } from "@/lib/supabase";
import { formatFcfa, formatDateTime } from "@/lib/format";

export type PeriodKey = "day" | "week" | "month" | "quarter" | "year";

export type Vue360Data = {
  period: PeriodKey;
  siteId: string | null;
  /** Super admin = filtre multi-sites ; sinon compte agence. */
  isPlatform: boolean;
  siteLabel: string | null;
  sites: { id: string; nom: string; ville: string; isActive: boolean }[];
  kpis: {
    sitesActifs: number;
    sitesTotal: number;
    commandes: number;
    employes: number;
    clients: number;
    ca: number;
    caLabel: string;
    depenses: number;
    marge: number;
    margeLabel: string;
    cartesFidelite: number;
  };
  recentOrders: {
    id: string;
    status: string;
    statusLabel: string;
    totalAmount: number;
    totalLabel: string;
    paymentMethod: string;
    createdAt: string;
    createdLabel: string;
    customerId: string;
    invoiceNumber: string | null;
  }[];
  alerts: { id: string; label: string; tone: "danger" | "warning" | "info" }[];
  paymentBreakdown: { method: string; label: string; amount: number; amountLabel: string }[];
  source: "supabase";
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  washing: "En lavage",
  completed: "Terminé",
  delivered: "Livré",
  cancelled: "Annulé",
};

const PAY_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobileMoney: "Mobile Money",
  card: "Carte",
};

function periodRange(period: PeriodKey): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  if (period === "day") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 7);
  } else if (period === "quarter") {
    const q = Math.floor(start.getMonth() / 3);
    start.setMonth(q * 3, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

async function countTable(table: string, siteId: string | null): Promise<number> {
  const supabase = getSupabase();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (table !== "lav_site" && table !== "lav_fidelite_carte") {
    query = query.is("deleted_at", null);
  }
  if (siteId && table !== "lav_site" && table !== "lav_fidelite_carte") {
    query = query.eq("lav_site_id", siteId);
  }
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

export async function getVue360(params?: {
  period?: PeriodKey;
  siteId?: string | null;
  isPlatform?: boolean;
  siteLabel?: string | null;
}): Promise<Vue360Data> {
  const period = params?.period ?? "month";
  const siteId = params?.siteId || null;
  const isPlatform = params?.isPlatform ?? !siteId;
  const siteLabel = params?.siteLabel ?? null;
  const supabase = getSupabase();
  const { start, end } = periodRange(period);

  const { data: sitesRows, error: sitesErr } = await supabase
    .from("lav_site")
    .select("id, nom, ville, is_active")
    .order("nom");
  if (sitesErr) throw new Error(sitesErr.message);

  const allSites = (sitesRows ?? []).map((s) => ({
    id: s.id as string,
    nom: s.nom as string,
    ville: (s.ville as string) || "",
    isActive: s.is_active === true,
  }));
  const scopedSites = siteId ? allSites.filter((s) => s.id === siteId) : allSites;

  let revQuery = supabase
    .from("revenues")
    .select("amount, payment_method, date")
    .is("deleted_at", null)
    .gte("date", start.toISOString())
    .lte("date", end.toISOString());
  if (siteId) revQuery = revQuery.eq("lav_site_id", siteId);

  let expQuery = supabase
    .from("expenses")
    .select("amount, date, is_approved")
    .is("deleted_at", null)
    .gte("date", start.toISOString())
    .lte("date", end.toISOString());
  if (siteId) expQuery = expQuery.eq("lav_site_id", siteId);

  let ordersQuery = supabase
    .from("orders")
    .select("id, status, total_amount, payment_method, created_at, customer_id, invoice_number")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
  if (siteId) ordersQuery = ordersQuery.eq("lav_site_id", siteId);

  let pendingExp = supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("is_approved", false);
  if (siteId) pendingExp = pendingExp.eq("lav_site_id", siteId);

  const pendingBatches = supabase
    .from("sync_pending_batches")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const [
    revenues,
    expenses,
    recentOrdersRaw,
    commandes,
    employes,
    clients,
    cartes,
    pendingExpCount,
    pendingBatchCount,
    siteConfigs,
  ] = await Promise.all([
    revQuery,
    expQuery,
    ordersQuery,
    countTable("orders", siteId),
    countTable("employees", siteId),
    countTable("customers", siteId),
    countTable("lav_fidelite_carte", null),
    pendingExp,
    pendingBatches,
    supabase.from("lav_site_config").select("lav_site_id, trial_end_at"),
  ]);

  if (revenues.error) throw new Error(revenues.error.message);
  if (expenses.error) throw new Error(expenses.error.message);
  if (recentOrdersRaw.error) throw new Error(recentOrdersRaw.error.message);

  const ca = (revenues.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const depenses = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const marge = ca - depenses;

  const payMap = new Map<string, number>();
  for (const r of revenues.data ?? []) {
    const method = String(r.payment_method ?? "autre");
    payMap.set(method, (payMap.get(method) ?? 0) + Number(r.amount ?? 0));
  }

  const alerts: Vue360Data["alerts"] = [];
  const now = Date.now();
  for (const cfg of siteConfigs.data ?? []) {
    if (siteId && String(cfg.lav_site_id) !== siteId) continue;
    const endAt = cfg.trial_end_at ? new Date(cfg.trial_end_at as string).getTime() : 0;
    const days = Math.ceil((endAt - now) / (1000 * 60 * 60 * 24));
    if (endAt && days <= 7) {
      const site = allSites.find((s) => s.id === cfg.lav_site_id);
      alerts.push({
        id: `trial-${cfg.lav_site_id}`,
        label: `Essai ${site?.nom ?? cfg.lav_site_id} : ${days < 0 ? "expiré" : `${days} j restants`}`,
        tone: days < 0 ? "danger" : "warning",
      });
    }
  }
  if ((pendingExpCount.count ?? 0) > 0) {
    alerts.push({
      id: "exp-pending",
      label: `${pendingExpCount.count} dépense(s) à approuver`,
      tone: "warning",
    });
  }
  if (isPlatform && (pendingBatchCount.count ?? 0) > 0) {
    alerts.push({
      id: "batches",
      label: `${pendingBatchCount.count} lot(s) de sync en attente`,
      tone: "danger",
    });
  }
  if (alerts.length === 0) {
    alerts.push({ id: "ok", label: "Aucune alerte critique", tone: "info" });
  }

  const sitesActifs = scopedSites.filter((s) => s.isActive).length;

  return {
    period,
    siteId,
    isPlatform,
    siteLabel,
    sites: isPlatform ? allSites : scopedSites,
    kpis: {
      sitesActifs,
      sitesTotal: siteId ? scopedSites.length : allSites.length,
      commandes,
      employes,
      clients,
      ca,
      caLabel: formatFcfa(ca),
      depenses,
      marge,
      margeLabel: formatFcfa(marge),
      cartesFidelite: cartes,
    },
    recentOrders: (recentOrdersRaw.data ?? []).map((o) => {
      const status = String(o.status ?? "");
      const amount = Number(o.total_amount ?? 0);
      return {
        id: o.id as string,
        status,
        statusLabel: STATUS_LABELS[status] ?? status,
        totalAmount: amount,
        totalLabel: formatFcfa(amount),
        paymentMethod: PAY_LABELS[String(o.payment_method)] ?? String(o.payment_method ?? ""),
        createdAt: String(o.created_at ?? ""),
        createdLabel: formatDateTime(o.created_at as string),
        customerId: String(o.customer_id ?? ""),
        invoiceNumber: (o.invoice_number as string) || null,
      };
    }),
    alerts,
    paymentBreakdown: Array.from(payMap.entries()).map(([method, amount]) => ({
      method,
      label: PAY_LABELS[method] ?? method,
      amount,
      amountLabel: formatFcfa(amount),
    })),
    source: "supabase",
  };
}
