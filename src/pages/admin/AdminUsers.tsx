import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Users, UserCheck, Shield, Loader2 } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  created_at: string;
  subscription?: { plan: string; status: string } | null;
};

export default function AdminUsers() {
  const { user, session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: false });

    if (!profileData) { setLoading(false); return; }

    const { data: subData } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status")
      .eq("status", "active");

    const subMap = Object.fromEntries(
      (subData ?? []).map((s: { user_id: string; plan: string; status: string }) => [s.user_id, s])
    );

    setProfiles(
      profileData.map((p) => ({
        ...p,
        subscription: subMap[p.id] ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = async (target: Profile, role: "user" | "admin") => {
    const verb = role === "admin" ? "make" : "remove";
    const confirmed = window.confirm(
      role === "admin"
        ? `Give ${target.email} admin access? They'll be able to manage all content, users, orders and site settings.`
        : `Remove admin access from ${target.email}?`
    );
    if (!confirmed) return;

    setUpdatingId(target.id);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ userId: target.id, role }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || `Couldn't ${verb} ${target.email} an admin.`);
        return;
      }
      toast.success(role === "admin" ? `${target.email} is now an admin.` : `Admin access removed from ${target.email}.`);
      setProfiles((prev) => prev.map((p) => (p.id === target.id ? { ...p, role } : p)));
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.name ?? "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || p.role === filterRole;
    return matchSearch && matchRole;
  });

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const planBadge = (p: Profile) => {
    if (!p.subscription) return null;
    const colors: Record<string, string> = {
      premium: "bg-primary/15 text-primary",
      annual: "bg-amber-500/15 text-amber-400",
      free: "bg-secondary text-muted-foreground",
    };
    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide ${colors[p.subscription.plan] ?? "bg-secondary text-muted-foreground"}`}>
        {p.subscription.plan}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-light mb-1">Users</h1>
        <p className="text-muted-foreground text-sm">
          {profiles.length} total · {profiles.filter((p) => p.role === "admin").length} admins
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">User</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">Plan</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium">Role</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{search ? "No users match your search." : "No users yet."}</p>
                  </td>
                </tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-card transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {(p.name?.[0] || p.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[160px]">{p.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {planBadge(p) ?? <span className="text-xs text-muted-foreground">Free</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserCheck className="w-3 h-3" /> User
                        </span>
                      )}
                      {updatingId === p.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : p.role === "admin" ? (
                        p.id === user?.id ? (
                          <span
                            className="text-[10px] text-muted-foreground/50"
                            title="You can't remove your own admin access — have another admin do it."
                          >
                            (you)
                          </span>
                        ) : (
                          <button
                            onClick={() => setRole(p, "user")}
                            className="text-[10px] text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
                          >
                            Remove admin
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setRole(p, "admin")}
                          className="text-[10px] text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
                        >
                          Make admin
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmt(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
