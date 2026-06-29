import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useWebsite } from "@/contexts/WebsiteContext";
import {
  Users, ShoppingBag, BookMarked, Video, MessageSquare,
  TrendingUp, ArrowRight, Layers, Globe,
} from "lucide-react";

type Stats = {
  users: number;
  orders: number;
  content: number;
  papers: number;
  sessions: number;
  testimonials: number;
};

export default function AdminDashboard() {
  const { current, websites } = useWebsite();
  const [stats, setStats] = useState<Stats>({ users: 0, orders: 0, content: 0, papers: 0, sessions: 0, testimonials: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current) return;
    const load = async () => {
      setLoading(true);
      const [
        { count: users },
        { count: orders },
        { count: content },
        { count: papers },
        { count: sessions },
        { count: testimonials },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("content_items").select("*", { count: "exact", head: true }).eq("website_id", current.id).eq("status", "published"),
        supabase.from("research_papers").select("*", { count: "exact", head: true }).eq("website_id", current.id).eq("status", "published"),
        supabase.from("content_items").select("*", { count: "exact", head: true }).eq("website_id", current.id).eq("type", "session").eq("status", "published"),
        supabase.from("testimonials").select("*", { count: "exact", head: true }).eq("website_id", current.id).eq("published", true),
      ]);
      setStats({ users: users ?? 0, orders: orders ?? 0, content: content ?? 0, papers: papers ?? 0, sessions: sessions ?? 0, testimonials: testimonials ?? 0 });
      setLoading(false);
    };
    load();
  }, [current]);

  const STAT_CARDS = [
    { label: "Total Users",       value: stats.users,        icon: Users,         color: "#6366f1", to: "/admin/users" },
    { label: "Orders",            value: stats.orders,       icon: ShoppingBag,   color: "#8b5cf6", to: "/admin/orders" },
    { label: "Published Content", value: stats.content,      icon: Layers,        color: "#0891b2", to: "/admin/content-studio" },
    { label: "Research Papers",   value: stats.papers,       icon: BookMarked,    color: "#059669", to: "/admin/research-papers" },
    { label: "Clarity Sessions",  value: stats.sessions,     icon: Video,         color: "#7c3aed", to: "/admin/clarity-sessions" },
    { label: "Testimonials",      value: stats.testimonials, icon: MessageSquare, color: "#e11d48", to: "/admin/testimonials" },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {current && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: `${current.brand_color}18`, color: current.brand_color, border: `1px solid ${current.brand_color}30` }}
            >
              <Globe className="w-3 h-3" />
              {current.name}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl font-light text-white mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">
          {current ? `Managing ${current.name}` : "Select a website to begin"}
          {current?.domain && ` · ${current.domain}`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${card.color}08`, border: `1px solid ${card.color}25` }} />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-semibold text-white mb-1">
                  {loading ? <span className="inline-block w-8 h-5 rounded bg-white/10 animate-pulse" /> : card.value}
                </p>
                <p className="text-xs text-white/35">{card.label}</p>
              </div>
              <ArrowRight className="absolute bottom-4 right-4 w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest">All Websites</h2>
          <Link to="/admin/create-website" className="text-xs text-primary hover:text-primary/80 transition-colors">+ Add website</Link>
        </div>
        <div className="space-y-2">
          {websites.map((site) => (
            <div key={site.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: current?.id === site.id ? `${site.brand_color}10` : "transparent" }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: site.brand_color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{site.name}</p>
                {site.domain && <p className="text-xs text-white/25 truncate">{site.domain}</p>}
              </div>
              {current?.id === site.id && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${site.brand_color}20`, color: site.brand_color }}>Active</span>
              )}
              <TrendingUp className="w-3.5 h-3.5 text-white/15" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
