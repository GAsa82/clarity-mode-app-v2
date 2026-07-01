import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Live metrics + health for the Executive Command Center.
 *
 * Design principle: every number is REAL or it is `null` ("—"). Nothing is
 * faked. Each probe is independently guarded, so one failing table degrades a
 * single tile instead of blanking the whole dashboard. Polls every 30s.
 */

export type Health = "ok" | "degraded" | "down" | "unconfigured";
export type HealthTile = { key: string; label: string; status: Health; detail: string };

export type CommandCenterMetrics = {
  revenue: number | null;          // ₹ from completed orders
  totalUsers: number | null;
  newUsersToday: number | null;
  newUsers7d: number | null;
  publishedToday: number | null;
  publishedContent: number | null;
  papers: number | null;
  sessions: number | null;
  testimonials: number | null;
  completedOrders: number | null;
  pendingOrders: number | null;
  failedOrders: number | null;
  auditEvents24h: number | null;
  health: HealthTile[];
  loading: boolean;
  lastUpdated: Date | null;
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function count(build: () => any): Promise<number | null> {
  try { const { count, error } = await build(); return error ? null : (count ?? 0); }
  catch { return null; }
}

async function fetchRevenue(): Promise<number | null> {
  try {
    const { data, error } = await supabase.from("orders").select("amount").eq("status", "completed");
    if (error) return null;
    return (data ?? []).reduce((s: number, o: any) => s + (o.amount || 0), 0) / 100;
  } catch { return null; }
}

async function pingDB(): Promise<HealthTile> {
  const t = performance.now();
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const ms = Math.round(performance.now() - t);
    if (error) return { key: "db", label: "Database", status: "down", detail: error.message.slice(0, 32) };
    return { key: "db", label: "Database", status: ms < 700 ? "ok" : "degraded", detail: `${ms}ms` };
  } catch { return { key: "db", label: "Database", status: "down", detail: "unreachable" }; }
}

async function pingStorage(): Promise<HealthTile> {
  const t = performance.now();
  try {
    const { error } = await supabase.storage.listBuckets();
    const ms = Math.round(performance.now() - t);
    if (error) return { key: "storage", label: "Storage", status: "degraded", detail: error.message.slice(0, 24) };
    return { key: "storage", label: "Storage", status: ms < 900 ? "ok" : "degraded", detail: `${ms}ms` };
  } catch { return { key: "storage", label: "Storage", status: "down", detail: "unreachable" }; }
}

async function pingAuth(): Promise<HealthTile> {
  const t = performance.now();
  try {
    const { error } = await supabase.auth.getSession();
    const ms = Math.round(performance.now() - t);
    if (error) return { key: "auth", label: "Auth", status: "down", detail: "error" };
    return { key: "auth", label: "Auth", status: "ok", detail: `${ms}ms` };
  } catch { return { key: "auth", label: "Auth", status: "down", detail: "unreachable" }; }
}

const EMPTY: CommandCenterMetrics = {
  revenue: null, totalUsers: null, newUsersToday: null, newUsers7d: null,
  publishedToday: null, publishedContent: null, papers: null, sessions: null,
  testimonials: null, completedOrders: null, pendingOrders: null, failedOrders: null,
  auditEvents24h: null, health: [], loading: true, lastUpdated: null,
};

export function useCommandCenterMetrics(websiteId: string | undefined, intervalMs = 30_000) {
  const [metrics, setMetrics] = useState<CommandCenterMetrics>(EMPTY);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const today = startOfToday();
    const [
      revenue, totalUsers, newUsersToday, newUsers7d,
      publishedContent, papers, sessions, testimonials,
      completedOrders, pendingOrders, failedOrders, auditEvents24h,
      db, storage, auth,
    ] = await Promise.all([
      fetchRevenue(),
      count(() => supabase.from("profiles").select("id", { count: "exact", head: true })),
      count(() => supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today)),
      count(() => supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(7))),
      count(() => {
        let q = supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "published");
        if (websiteId) q = q.eq("website_id", websiteId);
        return q;
      }),
      count(() => {
        let q = supabase.from("research_papers").select("id", { count: "exact", head: true }).eq("status", "published");
        if (websiteId) q = q.eq("website_id", websiteId);
        return q;
      }),
      count(() => {
        let q = supabase.from("content_items").select("id", { count: "exact", head: true })
          .eq("type", "session").eq("status", "published");
        if (websiteId) q = q.eq("website_id", websiteId);
        return q;
      }),
      count(() => {
        let q = supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("published", true);
        if (websiteId) q = q.eq("website_id", websiteId);
        return q;
      }),
      count(() => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed")),
      count(() => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending")),
      count(() => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed")),
      count(() => supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(1))),
      pingDB(), pingStorage(), pingAuth(),
    ]);

    // publishedToday: content published today for the active site (best-effort)
    const publishedToday = await count(() => {
      let q = supabase.from("content_items").select("id", { count: "exact", head: true })
        .eq("status", "published").gte("created_at", today);
      if (websiteId) q = q.eq("website_id", websiteId);
      return q;
    });

    const health: HealthTile[] = [
      db,
      { key: "api", label: "Supabase API", status: db.status === "down" ? "down" : "ok",
        detail: db.status === "down" ? "unreachable" : "reachable" },
      storage,
      auth,
      { key: "search", label: "Search", status: "unconfigured", detail: "no index yet" },
    ];

    if (!alive.current) return;
    setMetrics({
      revenue, totalUsers, newUsersToday, newUsers7d, publishedToday,
      publishedContent, papers, sessions, testimonials,
      completedOrders, pendingOrders, failedOrders, auditEvents24h,
      health, loading: false, lastUpdated: new Date(),
    });
  }, [websiteId]);

  useEffect(() => {
    alive.current = true;
    load();
    const id = setInterval(load, intervalMs);
    return () => { alive.current = false; clearInterval(id); };
  }, [load, intervalMs]);

  return { ...metrics, refresh: load };
}
