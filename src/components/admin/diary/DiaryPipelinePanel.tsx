import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertTriangle, RotateCcw, Play, ChevronDown, Clock } from "lucide-react";
import {
  listJobs, retryPage, runPipeline, STAGE_LABELS, STAGE_ORDER,
  type DiaryJob, type PipelineStage,
} from "@/lib/diary-pipeline";
import type { DiaryPage } from "@/lib/diary";

/**
 * Live view of the publishing queue: where every page is, what each stage
 * reported, and a way to restart anything that failed.
 */
export function DiaryPipelinePanel({
  pages,
  onChanged,
}: {
  pages: DiaryPage[];
  onChanged: () => void;
}) {
  const [jobs, setJobs] = useState<DiaryJob[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setJobs(await listJobs());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Poll only while something is actually moving, so an idle dashboard
    // isn't hammering the database every few seconds.
    const id = setInterval(() => {
      setJobs((current) => {
        if (current.some((j) => j.status === "queued" || j.status === "running")) load();
        return current;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [load]);

  const nameFor = (pageId: string) => {
    const p = pages.find((x) => x.id === pageId);
    return p?.summary || p?.original_filename || "Diary page";
  };

  const doRetry = async (pageId: string) => {
    setBusy(pageId);
    try {
      await retryPage(pageId);
      await runPipeline(pageId);
      await load();
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const failed = jobs.filter((j) => j.status === "failed");

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/25 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium mb-1">No pipeline runs yet</p>
        <p className="text-xs text-muted-foreground">
          Upload a page and the pipeline starts on its own.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{jobs.length} run{jobs.length === 1 ? "" : "s"}</span>
        {active.length > 0 && <span className="text-primary">{active.length} in progress</span>}
        {failed.length > 0 && <span className="text-destructive">{failed.length} failed</span>}
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const isOpen = expanded === job.page_id;
          const stageIndex = STAGE_ORDER.indexOf(job.stage);
          const pct =
            job.status === "done" ? 100
              : stageIndex < 0 ? 0
                : Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100);

          return (
            <div key={job.id} className="rounded-2xl border border-border bg-card/60 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : job.page_id)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <JobIcon job={job} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{nameFor(job.page_id)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {job.status === "failed"
                      ? job.last_error ?? "Failed"
                      : STAGE_LABELS[job.stage as PipelineStage] ?? job.stage}
                    {job.attempts > 0 && job.status !== "done" ? ` · attempt ${job.attempts + 1}` : ""}
                  </p>

                  {job.status !== "done" && job.status !== "failed" && (
                    <div className="h-1 mt-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "failed" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); doRetry(job.page_id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); doRetry(job.page_id); } }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-[11px] hover:bg-secondary/70 transition cursor-pointer"
                    >
                      {busy === job.page_id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RotateCcw className="w-3 h-3" />}
                      Retry
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 px-3.5 py-3 space-y-2 bg-background/30">
                  {/* Stage rail */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {STAGE_ORDER.filter((s) => s !== "done").map((s) => {
                      const idx = STAGE_ORDER.indexOf(s);
                      const state =
                        job.status === "done" || idx < stageIndex ? "done"
                          : idx === stageIndex ? (job.status === "failed" ? "failed" : "current")
                            : "todo";
                      return (
                        <span
                          key={s}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                            state === "done" ? "bg-emerald-500/15 text-emerald-400"
                              : state === "current" ? "bg-primary/15 text-primary"
                                : state === "failed" ? "bg-destructive/15 text-destructive"
                                  : "bg-secondary text-muted-foreground/60"
                          }`}
                        >
                          {STAGE_LABELS[s]}
                        </span>
                      );
                    })}
                  </div>

                  {job.logs?.length ? (
                    <ul className="space-y-1 max-h-56 overflow-y-auto">
                      {job.logs.map((log, i) => (
                        <li key={i} className="flex gap-2 text-[10px] font-mono">
                          <span className="text-muted-foreground/50 shrink-0">
                            {new Date(log.at).toLocaleTimeString()}
                          </span>
                          <span className="text-primary/70 shrink-0 w-20 truncate">{log.stage}</span>
                          <span
                            className={`min-w-0 ${
                              log.message.startsWith("Error") ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {log.message}
                            {log.ms ? ` (${(log.ms / 1000).toFixed(1)}s)` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No log entries yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobIcon({ job }: { job: DiaryJob }) {
  const cls = "w-4 h-4 shrink-0";
  if (job.status === "failed") return <AlertTriangle className={`${cls} text-destructive`} />;
  if (job.status === "done") return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (job.status === "running") return <Loader2 className={`${cls} text-primary animate-spin`} />;
  return <Play className={`${cls} text-muted-foreground/50`} />;
}
