import { useState } from "react";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  Mail,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  joinedAt: string;
  lastActive: string;
  chatSessions: number;
  status: "active" | "inactive";
}

const demoUsers: UserData[] = [
  { id: "1", email: "admin@claritymode.com", name: "Admin", role: "admin", joinedAt: "2024-01-01", lastActive: "2025-02-15", chatSessions: 156, status: "active" },
  { id: "2", email: "sarah@example.com", name: "Sarah", role: "user", joinedAt: "2024-06-15", lastActive: "2025-02-14", chatSessions: 45, status: "active" },
  { id: "3", email: "mike@example.com", name: "Mike", role: "user", joinedAt: "2024-08-20", lastActive: "2025-02-10", chatSessions: 23, status: "active" },
  { id: "4", email: "emma@example.com", name: "Emma", role: "user", joinedAt: "2024-10-05", lastActive: "2025-01-28", chatSessions: 12, status: "inactive" },
  { id: "5", email: "alex@example.com", name: "Alex", role: "user", joinedAt: "2024-11-12", lastActive: "2025-02-12", chatSessions: 8, status: "active" },
  { id: "6", email: "jordan@example.com", name: "Jordan", role: "user", joinedAt: "2025-01-03", lastActive: "2025-02-01", chatSessions: 3, status: "inactive" },
];

export default function AdminUsers() {
  const [users] = useState<UserData[]>(demoUsers);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = users.filter((u) => u.status === "active").length;
  const totalSessions = users.reduce((acc, u) => acc + u.chatSessions, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor user activity and engagement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Total Users</span>
          </div>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <p className="text-3xl font-bold">{activeUsers}</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-muted-foreground">Total Chat Sessions</span>
          </div>
          <p className="text-3xl font-bold">{totalSessions}</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-muted-foreground">Avg Sessions/User</span>
          </div>
          <p className="text-3xl font-bold">{(totalSessions / users.length).toFixed(1)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary outline-none text-sm transition-colors"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/30 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Joined</div>
          <div className="col-span-2">Last Active</div>
          <div className="col-span-1">Sessions</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1"></div>
        </div>
        {filtered.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-border items-center hover:bg-secondary/20 transition-colors"
          >
            <div className="col-span-3 flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {user.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="col-span-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  user.role === "admin"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {user.role}
              </span>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">{user.joinedAt}</div>
            <div className="col-span-2 text-xs text-muted-foreground">{user.lastActive}</div>
            <div className="col-span-1 text-sm font-medium">{user.chatSessions}</div>
            <div className="col-span-1">
              <span
                className={`inline-flex items-center gap-1 text-[10px] ${
                  user.status === "active" ? "text-green-400" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    user.status === "active" ? "bg-green-400" : "bg-muted-foreground"
                  }`}
                />
                {user.status}
              </span>
            </div>
            <div className="col-span-1 text-right">
              <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}