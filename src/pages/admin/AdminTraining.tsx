import { useState } from "react";
import {
  Brain,
  RefreshCw,
  Database,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  TrendingUp,
} from "lucide-react";
import { healthCheck } from "@/lib/clarity-ai-api";

interface TrainingJob {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  lastRun?: string;
  progress?: number;
}

export default function AdminTraining() {
  const [jobs, setJobs] = useState<TrainingJob[]>([
    { id: "embeddings", name: "Generate Embeddings", status: "idle", lastRun: "2025-01-28 14:30" },
    { id: "knowledge", name: "Rebuild Knowledge Base", status: "idle", lastRun: "2025-01-27 10:15" },
    { id: "retrain", name: "Retrain AI", status: "idle", lastRun: "2025-01-25 09:00" },
    { id: "vectorstore", name: "Refresh Vector Store", status: "idle", lastRun: "2025-01-28 15:00" },
  ]);
  const [indexedDocs, setIndexedDocs] = useState(42);
  const [lastTrainingDate, setLastTrainingDate] = useState("2025-01-28 15:00");

  const runJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: "running", progress: 0 } : j))
    );

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: "completed", progress: 100, lastRun: new Date().toLocaleString() }
              : j
          )
        );
        setLastTrainingDate(new Date().toLocaleString());
        if (jobId === "embeddings" || jobId === "knowledge") {
          setIndexedDocs((prev) => prev + Math.floor(Math.random() * 5));
        }
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, progress } : j))
        );
      }
    }, 500);
  };

  const jobIcons: Record<string, React.ElementType> = {
    embeddings: Zap,
    knowledge: Database,
    retrain: Brain,
    vectorstore: RefreshCw,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Training</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage AI training, embeddings, and knowledge base indexing
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Indexed Documents</span>
          </div>
          <p className="text-3xl font-bold">{indexedDocs}</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Last Training</span>
          </div>
          <p className="text-sm font-medium">{lastTrainingDate}</p>
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-muted-foreground">Training Status</span>
          </div>
          <p className="text-sm font-medium text-green-400">Operational</p>
        </div>
      </div>

      {/* Training Jobs */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const Icon = jobIcons[job.id] || Brain;
          return (
            <div
              key={job.id}
              className="p-5 rounded-xl bg-card border border-border"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.lastRun ? `Last run: ${job.lastRun}` : "Never run"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {job.status === "running" && (
                    <div className="w-32">
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${job.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right mt-1">
                        {Math.round(job.progress || 0)}%
                      </p>
                    </div>
                  )}
                  {job.status === "completed" && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="w-3 h-3" /> Done
                    </span>
                  )}
                  {job.status === "failed" && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                  <button
                    onClick={() => runJob(job.id)}
                    disabled={job.status === "running"}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {job.status === "running" ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running...
                      </span>
                    ) : (
                      "Run"
                    )}
                  </button>
                </div>
              </div>
              {job.status === "running" && (
                <div className="mt-3 h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                    style={{ width: `${job.progress || 0}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}