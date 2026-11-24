import { getSupabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import type { SessionPayload } from "@/server/auth/session";
import { isPlatformUser, resolveSiteScope } from "@/server/auth/guards";

export type TrialSnapshot = {
  trialEndAt: string | null;
  trialDurationMonths: number | null;
  remainingDays: number | null;
  isExpired: boolean;
  endLabel: string;
  extensionRequested: boolean;
  extensionMonths: number | null;
  remoteVersion: number | null;
};

export type SiteTrialRow = {
  siteId: string;
  siteName: string;
  ville: string;
  trialEndAt: string | null;
  trialDurationMonths: number | null;
  remainingDays: number | null;
  isExpired: boolean;
  endLabel: string;
  remoteVersion: number | null;
};

export type TrialDashboard = {
  isPlatform: boolean;
  focusSiteId: string | null;
  global: TrialSnapshot;
  site: TrialSnapshot | null;
  sites: SiteTrialRow[];
};

function computeTrial(endAt: string | null, months: number | null): TrialSnapshot {
  const now = Date.now();
  let remainingDays: number | null = null;
  let isExpired = false;
  if (endAt) {
    const end = new Date(endAt).getTime();
    remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    isExpired = now > end;
  }
  return {
    trialEndAt: endAt,
    trialDurationMonths: months,
    remainingDays,
    isExpired,
    endLabel: endAt ? formatDateTime(endAt) : "—",
    extensionRequested: false,
    extensionMonths: null,
    remoteVersion: null,
  };
}

export async function getTrialDashboard(
  session: SessionPayload,
  siteFilter?: string | null,
): Promise<TrialDashboard> {
  const supabase = getSupabase();
  const isPlatform = isPlatformUser(session);
  const focusSiteId = resolveSiteScope(session, siteFilter);

  const [appCfg, sitesRes, configsRes] = await Promise.all([
    supabase.from("app_config").select("*").eq("id", "default").maybeSingle(),
    supabase.from("lav_site").select("id, nom, ville, is_active").order("nom"),
    supabase.from("lav_site_config").select("*"),
  ]);

  const app = appCfg.data;
  const global: TrialSnapshot = {
    ...computeTrial(
      app?.trial_end_at ? String(app.trial_end_at) : null,
      app?.trial_duration_months != null ? Number(app.trial_duration_months) : null,
    ),
    extensionRequested: app?.extension_requested === true,
    extensionMonths: app?.extension_months != null ? Number(app.extension_months) : null,
    remoteVersion: app?.remote_version != null ? Number(app.remote_version) : null,
  };

  const sites = sitesRes.data ?? [];
  const configs = configsRes.data ?? [];
  const configBySite = new Map(configs.map((c) => [String(c.lav_site_id), c]));

  const siteRows: SiteTrialRow[] = sites
    .filter((s) => {
      if (!focusSiteId || !isPlatform) return true;
      return String(s.id) === focusSiteId;
    })
    .map((s) => {
      const cfg = configBySite.get(String(s.id));
      const snap = computeTrial(
        cfg?.trial_end_at ? String(cfg.trial_end_at) : null,
        cfg?.trial_duration_months != null ? Number(cfg.trial_duration_months) : null,
      );
      return {
        siteId: String(s.id),
        siteName: String(s.nom ?? s.id),
        ville: String(s.ville ?? ""),
        ...snap,
        remoteVersion: cfg?.remote_version != null ? Number(cfg.remote_version) : null,
      };
    });

  let siteFocus: TrialSnapshot | null = null;
  if (!isPlatform && focusSiteId) {
    const row = siteRows.find((r) => r.siteId === focusSiteId);
    if (row) {
      siteFocus = {
        trialEndAt: row.trialEndAt,
        trialDurationMonths: row.trialDurationMonths,
        remainingDays: row.remainingDays,
        isExpired: row.isExpired,
        endLabel: row.endLabel,
        extensionRequested: global.extensionRequested,
        extensionMonths: global.extensionMonths,
        remoteVersion: row.remoteVersion,
      };
    }
  } else if (isPlatform && focusSiteId) {
    const row = siteRows.find((r) => r.siteId === focusSiteId);
    if (row) {
      siteFocus = {
        trialEndAt: row.trialEndAt,
        trialDurationMonths: row.trialDurationMonths,
        remainingDays: row.remainingDays,
        isExpired: row.isExpired,
        endLabel: row.endLabel,
        extensionRequested: global.extensionRequested,
        extensionMonths: global.extensionMonths,
        remoteVersion: row.remoteVersion,
      };
    }
  }

  return {
    isPlatform,
    focusSiteId: focusSiteId ?? null,
    global,
    site: siteFocus,
    sites: siteRows,
  };
}