import { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Brain,
  Users,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { healthCheck, getDashboard, type DashboardStats, type HealthStatus } from "@/lib/clarity-ai-api";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  change?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiStatus, setAiStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboard().catch(() => null),
      healthCheck().catch(() => null),
    ]).then(([dash, health]) => {
      setStats(dash);
      setAiStatus(health);
    }).finally(() => setLoading(false));
  }, []);

  const statCards: StatCard[] = [
    {
      label: "Total Diary Entries",
      value: stats?.total_entries ?? "—",
      icon: FileText,
      color: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Total Chunks",
      value: stats?.total_chunks ?? "—",
      icon: Upload,
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "AI Status",
      value: aiStatus ? "Online" : "Offline",
      icon: Brain,
      color: aiStatus ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10",
    },
    {
      label: "Top Emotion",
      value: stats?.top_emotions?.[0]?.emotion ?? "—",
      icon: Activity,
      color: "text-purple-400 bg-purple-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your Clarity AI system
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="p-5 rounded-xl bg-card border border-border hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.change && (
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {card.change}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Status Detail */}
      {aiStatus && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI System Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">{aiStatus.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="text-sm font-medium">{aiStatus.version}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service</p>
              <p className="text-sm font-medium">{aiStatus.service}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      {stats?.recent_entries && stats.recent_entries.length > 0 && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recent Uploads
          </h3>
          <div className="space-y-2">
            {stats.recent_entries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.filename}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {entry.text || "No preview"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.emotions.length > 0 && (
                    <div className="flex gap-1">
                      {entry.emotions.slice(0, 2).map((em) => (
                        <span
                          key={em}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]"
                        >
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {entry.uploaded_at}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offline Warning */}
      {!aiStatus && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">AI Backend Offline</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start the clarity-ai backend on port 8000 to enable AI features.
              Run: <code className="px-1 py-0.5 rounded bg-secondary text-foreground/70">cd clarity-ai/backend && python main.py</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}