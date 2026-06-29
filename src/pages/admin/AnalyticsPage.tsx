import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, CreditCard, ShoppingBag, TrendingUp, BookMarked, FileText, Package } from "lucide-react";

type Stats = {
  total_users: number;
  active_subscriptions: number;
  total_orders: number;
  total_revenue_paise: number;
  published_papers: number;
  published_content: number;
  books_in_stock: number;
};

type SubByPlan = { plan: string; count: number };
type RecentOrder = { id: string; item_title: string | null; amount: number; status: string; created_at: string };

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [subsByPlan, setSubsByPlan] = useState<SubByPlan[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: viewData }, { data: plansData }, { data: ordersData }] = await Promise.all([
        supabase.from("admin_analytics").select("*").single(),
        supabase.rpc
          ? supabase
              .from("subscriptions")
              .select("plan")
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
        supabase
          .from("orders")
          .select("id, item_title, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setStats(viewData as Stats);

      if (plansData) {
        const counts: Record<string, number> = {};
        (plansData as { plan: string }[]).forEach((r) => {
          counts[r.plan] = (counts[r.plan] ?? 0) + 1;
        });
        setSubsByPlan(Object.entries(counts).map(([plan, count]) => ({ plan, count })));
      }

      setRecentOrders((ordersData ?? []) as RecentOrder[]);
      setLoading(false);
    };
    load();
  }, []);

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-400 bg-blue-500/10" },
        { label: "Active Subscriptions", value: stats.active_subscriptions, icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10" },
        { label: "Total Orders", value: stats.total_orders, icon: ShoppingBag, color: "text-amber-400 bg-amber-500/10" },
        {
          label: "Total Revenue",
          value: `₹${(stats.total_revenue_paise / 100).toLocaleString("en-IN")}`,
          icon: TrendingUp,
          color: "text-primary bg-primary/10",
        },
        { label: "Published Papers", value: stats.published_papers, icon: BookMarked, color: "text-purple-400 bg-purple-500/10" },
        { label: "Published Content", value: stats.published_content, icon: FileText, color: "text-cyan-400 bg-cyan-500/10" },
        { label: "Books In Stock", value: stats.books_in_stock, icon: Package, color: "text-rose-400 bg-rose-500/10" },
      ]
    : [];

  const statusColor: Record<string, string> = {
    completed: "text-emerald-400",
    pending: "text-amber-400",
    failed: "text-rose-400",
    refunded: "text-blue-400",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-light mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">Live metrics from your Supabase database.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl bg-card border border-border p-5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                    <Icon className="w-4.5 h-4.5" strokeWidth={1.5} />
                  </div>
                  <p className="font-display text-2xl font-light">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscriptions by plan */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <h3 className="font-medium text-sm mb-4">Active Subscriptions by Plan</h3>
              {subsByPlan.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active subscriptions yet.</p>
              ) : (
                <div className="space-y-3">
                  {subsByPlan.map((s) => (
                    <div key={s.plan} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{s.plan}</span>
                      <span className="font-medium text-sm">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <h3 className="font-medium text-sm mb-4">Recent Orders</h3>
              {recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{o.item_title ?? "Unknown item"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">₹{(o.amount / 100).toFixed(0)}</p>
                        <p className={`text-[10px] capitalize ${statusColor[o.status] ?? "text-muted-foreground"}`}>{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
