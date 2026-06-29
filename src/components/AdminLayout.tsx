import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShoppingBag,
  Tag,
  Layers,
  BookMarked,
  Store,
  Library,
  Grid3X3,
  Shield,
  BarChart3,
  ClipboardList,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Sparkles,
  Upload,
  Database,
  Brain,
  FileText,
  Image,
  Headphones,
  Video,
  CalendarCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo.png";

type NavGroup = {
  label: string;
  items: { to: string; icon: React.ElementType; label: string; exact?: boolean }[];
};

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { to: "/admin/users", icon: Users, label: "Users" },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
      { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
      { to: "/admin/coupons", icon: Tag, label: "Coupons" },
    ],
  },
  {
    label: "Content Studio",
    items: [
      { to: "/admin/content-studio", icon: Layers, label: "Content Studio" },
      { to: "/admin/research-papers", icon: BookMarked, label: "Research Papers" },
      { to: "/admin/old-books", icon: Store, label: "Old Books" },
      { to: "/admin/library", icon: Library, label: "Premium Library" },
      { to: "/admin/frameworks", icon: Grid3X3, label: "Frameworks" },
      { to: "/admin/protocols", icon: Shield, label: "Protocols" },
      { to: "/admin/templates", icon: FileText, label: "Templates" },
      { to: "/admin/clarity-sessions", icon: Video, label: "Clarity Sessions" },
      { to: "/admin/media", icon: Image, label: "Media Library" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/admin/audit-logs", icon: ClipboardList, label: "Audit Logs" },
      { to: "/admin/coaching", icon: CalendarCheck, label: "Coaching" },
      { to: "/admin/upload", icon: Upload, label: "Upload Diary" },
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
            <img src={logoImg} alt="Clarity Mode" className="w-7 h-7 rounded-full object-cover shrink-0" />
            <div className="min-w-0">
              <span className="font-display text-sm font-medium tracking-tight block truncate">Clarity Mode</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary flex items-center gap-1">
                <Sparkles className="w-2 h-2" /> Admin Panel
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {navGroups.map((group) => {
            const isCollapsed = collapsed[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1 mb-1 group"
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to, item.exact);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-2 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {(profile?.name?.[0] || user?.email?.[0] || "A").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.name || user?.email?.split("@")[0] || "Admin"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-1.5 px-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-1"
            >
              <ChevronLeft className="w-3 h-3" /> Back to site
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Content Studio v2</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
