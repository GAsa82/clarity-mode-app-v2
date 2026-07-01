import { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, ShoppingBag, Tag, Layers,
  BookMarked, Store, Library, Grid3X3, Shield, FileText, Image,
  BarChart3, ClipboardList, Settings, Menu, X, LogOut, Sparkles,
  Video, MessageSquare, ChevronDown, Globe, Plus, Check, Zap,
  BookOpen, Brain, Upload, Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsite, type Website } from "@/contexts/WebsiteContext";
import { getPendingFaceCount } from "@/lib/face-submissions";
import logoImg from "@/assets/logo.png";

type NavItem = { to: string; icon: React.ElementType; label: string; exact?: boolean; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

// ── per-site nav configs ──────────────────────────────────────────────────────
const SITE_NAV: Record<string, NavGroup[]> = {
  "clarity-mode": [
    {
      label: "Content",
      items: [
        { to: "/admin/site-content",     icon: Sparkles,      label: "Site Content" },
        { to: "/admin/clarity-sessions", icon: Video,         label: "Clarity Sessions" },
        { to: "/admin/testimonials",     icon: MessageSquare, label: "Testimonials" },
        { to: "/admin/face-submissions", icon: Crown,         label: "Member Submissions" },
        { to: "/admin/library",          icon: Library,       label: "Premium Library" },
        { to: "/admin/templates",        icon: FileText,      label: "Templates" },
        { to: "/admin/media",            icon: Image,         label: "Media Library" },
      ],
    },
  ],
  "breakthrough-protocol": [
    {
      label: "Content",
      items: [
        { to: "/admin/research-papers",  icon: BookMarked, label: "Research Papers" },
        { to: "/admin/old-books",        icon: Store,      label: "Old Books" },
        { to: "/admin/library",          icon: Library,    label: "Premium Library" },
        { to: "/admin/frameworks",       icon: Grid3X3,    label: "Frameworks" },
        { to: "/admin/protocols",        icon: Shield,     label: "Protocols" },
        { to: "/admin/templates",        icon: FileText,   label: "Templates" },
        { to: "/admin/media",            icon: Image,      label: "Media Library" },
      ],
    },
  ],
};

// Always-visible groups
const UNIVERSAL_NAV: NavGroup[] = [
  {
    label: "Commerce",
    items: [
      { to: "/admin/orders",        icon: ShoppingBag, label: "Orders" },
      { to: "/admin/subscriptions", icon: CreditCard,  label: "Subscriptions" },
      { to: "/admin/coupons",       icon: Tag,         label: "Coupons" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin",          icon: LayoutDashboard, label: "Dashboard", exact: true },
      { to: "/admin/users",    icon: Users,           label: "Users" },
      { to: "/admin/analytics",icon: BarChart3,       label: "Analytics" },
      { to: "/admin/audit-logs",icon: ClipboardList,  label: "Audit Logs" },
      { to: "/admin/settings", icon: Settings,        label: "Settings" },
    ],
  },
];

// ── Website switcher ──────────────────────────────────────────────────────────
function WebsiteSwitcher() {
  const { websites, current, switchWebsite } = useWebsite();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dot = (color: string) => (
    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
  );

  return (
    <div ref={ref} className="relative px-3 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200"
        style={{
          background: "rgba(99,102,241,0.08)",
          borderColor: open ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
        }}
      >
        {current && dot(current.brand_color)}
        <span className="flex-1 text-left text-sm font-medium text-foreground truncate">
          {current?.name ?? "Select website"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl border border-white/10 overflow-hidden"
            style={{ background: "rgba(15,12,30,0.98)", backdropFilter: "blur(16px)" }}
          >
            {websites.map((site) => (
              <button
                key={site.id}
                onClick={() => { switchWebsite(site); setOpen(false); navigate("/admin"); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/5 transition-colors text-left group"
              >
                {dot(site.brand_color)}
                <span className="flex-1 text-sm text-foreground/90 truncate">{site.name}</span>
                {current?.id === site.id && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}

            <div className="border-t border-white/8 p-1.5">
              <Link
                to="/admin/create-website"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm text-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                Add website
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const location = useLocation();
  const active = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to) && item.to !== "/admin";
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 group ${
        active
          ? "text-white"
          : "text-white/40 hover:text-white/80"
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 rounded-xl"
          style={{ background: "rgba(99,102,241,0.15)", boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.25)" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <Icon className={`relative z-10 w-3.5 h-3.5 shrink-0 transition-colors ${active ? "text-primary" : "text-white/30 group-hover:text-white/60"}`} />
      <span className="relative z-10 truncate">{item.label}</span>
      {item.badge ? (
        <span className="relative z-10 ml-auto min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
          {item.badge}
        </span>
      ) : null}
      {active && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: "rgb(99,102,241)" }}
          layoutId="activePill"
        />
      )}
    </Link>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { current } = useWebsite();

  const [pendingFaces, setPendingFaces] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getPendingFaceCount().then((c) => alive && setPendingFaces(c)).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const siteNav = current ? (SITE_NAV[current.slug] ?? []) : [];
  const allGroups = [...siteNav, ...UNIVERSAL_NAV];

  const sidebar = (
    <aside
      className="w-56 flex flex-col h-full"
      style={{
        background: "rgba(8,6,20,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/6 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 flex-1 min-w-0">
          <img src={logoImg} alt="logo" className="w-7 h-7 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90 truncate leading-none">Master CMS</p>
            <p className="text-[10px] text-primary/70 tracking-widest uppercase mt-0.5">Control Panel</p>
          </div>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-white/8 text-white/40">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Website switcher */}
      <div className="pt-4 shrink-0">
        <p className="px-5 mb-2 text-[9px] uppercase tracking-[0.2em] text-white/25 font-medium">Active Website</p>
        <WebsiteSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 mt-1
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {allGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[9px] uppercase tracking-[0.2em] text-white/20 font-medium">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  item={item.to === "/admin/face-submissions" ? { ...item, badge: pendingFaces } : item}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Content Studio hub link */}
        <div>
          <p className="px-2 mb-1.5 text-[9px] uppercase tracking-[0.2em] text-white/20 font-medium">Studio</p>
          <NavLink item={{ to: "/admin/content-studio", icon: Layers, label: "Content Studio" }} onClick={() => setSidebarOpen(false)} />
        </div>
      </nav>

      {/* User */}
      <div className="shrink-0 px-3 py-3 border-t border-white/6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 text-white"
            style={{ background: "rgba(99,102,241,0.25)" }}
          >
            {user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-white/70 truncate">
              {user?.email?.split("@")[0] ?? "Admin"}
            </p>
            <p className="text-[9px] text-white/25 truncate">Super Admin</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-white/60 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "#07060f" }}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0">
        {sidebar}
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed inset-y-0 left-0 z-50 w-56 lg:hidden"
          >
            {sidebar}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-14 shrink-0"
          style={{
            background: "rgba(7,6,15,0.85)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-white/8 text-white/40 hover:text-white/80 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {current && (
              <>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                  style={{
                    background: `${current.brand_color}18`,
                    color: current.brand_color,
                    border: `1px solid ${current.brand_color}30`,
                  }}
                >
                  <Globe className="w-3 h-3" />
                  {current.name}
                </span>
                <span className="text-white/20 text-xs">›</span>
              </>
            )}
            <span className="text-sm text-white/50 truncate">Admin Panel</span>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/80 hover:bg-white/6 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              View site
            </Link>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
