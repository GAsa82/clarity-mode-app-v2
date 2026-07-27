import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UploadCloud, FileImage, X, RotateCcw, CheckCircle2, AlertTriangle, Copy, Loader2, FolderUp,
} from "lucide-react";
import { uploadDiaryPage, formatBytes, type DiaryPage } from "@/lib/diary";
import { runPipeline, STAGE_LABELS, type PipelineStage } from "@/lib/diary-pipeline";

type QueueState = "queued" | "uploading" | "processing" | "done" | "duplicate" | "error";

type QueueItem = {
  key: string;
  file: File;
  state: QueueState;
  progress: number;
  message?: string;
  duplicateOf?: DiaryPage;
  pageId?: string;
  stage?: PipelineStage;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

// Directory picking is a non-standard attribute pair React's types don't model.
const DIRECTORY_PROPS = { webkitdirectory: "", directory: "" } as Record<string, string>;

export function DiaryUploader({
  onUploaded,
  autoRun = true,
}: {
  onUploaded: () => void;
  /** Upload only, leaving pages `pending`, when false. */
  autoRun?: boolean;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  // The worker loop needs to read the live queue between awaits. React state
  // is async, so a ref mirrors it as the synchronous source of truth and
  // setQueue exists purely to drive rendering.
  const queueRef = useRef<QueueItem[]>([]);
  const runningRef = useRef(false);

  const commit = useCallback((updater: (q: QueueItem[]) => QueueItem[]) => {
    queueRef.current = updater(queueRef.current);
    setQueue(queueRef.current);
  }, []);

  const patch = useCallback(
    (key: string, next: Partial<QueueItem>) =>
      commit((q) => q.map((it) => (it.key === key ? { ...it, ...next } : it))),
    [commit]
  );

  const runQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      // Re-scan every pass so files dropped mid-upload are picked up too.
      for (;;) {
        const item = queueRef.current.find((it) => it.state === "queued");
        if (!item) break;

        patch(item.key, { state: "uploading", progress: 0 });

        const result = await uploadDiaryPage(item.file, {
          onProgress: (pct) => patch(item.key, { progress: pct }),
        });

        if (result.ok) {
          if (!autoRun) {
            patch(item.key, { state: "done", progress: 100 });
          } else {
            // The whole point of the module: uploading is the only manual act.
            patch(item.key, { state: "processing", progress: 100, pageId: result.page.id });
            const run = await runPipeline(result.page.id, (info) =>
              patch(item.key, {
                stage: info.stage,
                message: info.error ?? STAGE_LABELS[info.stage],
              })
            );
            patch(item.key, {
              state: run.ok ? "done" : "error",
              stage: run.stage,
              message: run.ok ? "Published" : run.error,
            });
            onUploaded(); // refresh counters as each page lands
          }
        } else if ("duplicateOf" in result) {
          patch(item.key, {
            state: "duplicate",
            duplicateOf: result.duplicateOf,
            message: "Already uploaded — identical file",
          });
        } else {
          patch(item.key, { state: "error", message: result.error });
        }
      }
    } finally {
      runningRef.current = false;
      onUploaded();
    }
  }, [patch, onUploaded]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      // Folder uploads sweep in every file type; keep only real page scans.
      // Some browsers report an empty type for HEIC, so allow that through.
      const incoming = Array.from(files).filter((f) => ACCEPTED.includes(f.type) || f.type === "");
      if (incoming.length === 0) return;

      commit((q) => [
        ...q,
        ...incoming.map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          state: "queued" as QueueState,
          progress: 0,
        })),
      ]);
      void runQueue();
    },
    [commit, runQueue]
  );

  const retry = (key: string) => {
    patch(key, { state: "queued", progress: 0, message: undefined });
    void runQueue();
  };

  /** Upload a detected duplicate anyway — e.g. a genuinely re-photographed page. */
  const forceUpload = async (item: QueueItem) => {
    patch(item.key, { state: "uploading", progress: 0, message: undefined });
    const result = await uploadDiaryPage(item.file, {
      allowDuplicate: true,
      onProgress: (pct) => patch(item.key, { progress: pct }),
    });
    if (result.ok) {
      patch(item.key, { state: "done", progress: 100, message: undefined });
      onUploaded();
    } else {
      patch(item.key, {
        state: "error",
        message: "error" in result ? result.error : "Upload failed",
      });
    }
  };

  const remove = (key: string) => commit((q) => q.filter((it) => it.key !== key));
  const clearFinished = () =>
    commit((q) => q.filter((it) => it.state !== "done" && it.state !== "duplicate"));

  const active = queue.filter(
    (it) => it.state === "uploading" || it.state === "queued" || it.state === "processing"
  ).length;
  const done = queue.filter((it) => it.state === "done").length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:border-primary/40"
        }`}
      >
        <UploadCloud
          className={`w-10 h-10 mx-auto mb-3 transition-colors ${
            dragging ? "text-primary" : "text-muted-foreground/40"
          }`}
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium mb-1">Drop diary pages here</p>
        <p className="text-xs text-muted-foreground mb-5">
          {autoRun
            ? "Upload is the only step — reading, analysis, SEO, thumbnails and publishing all run automatically."
            : "JPEG, PNG, WEBP, HEIC or PDF scans · up to 50MB each · duplicates detected automatically"}
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition"
          >
            <FileImage className="w-3.5 h-3.5" /> Choose files
          </button>
          <button
            type="button"
            onClick={() => folderRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-xs font-medium hover:bg-secondary/70 transition"
          >
            <FolderUp className="w-3.5 h-3.5" /> Upload folder
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderRef}
          type="file"
          multiple
          {...DIRECTORY_PROPS}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground">
              {active > 0 ? `${active} in progress · ` : ""}
              {done} uploaded · {queue.length} total
            </p>
            <button
              type="button"
              onClick={clearFinished}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear finished
            </button>
          </div>

          <ul className="divide-y divide-border/60 max-h-80 overflow-y-auto">
            <AnimatePresence initial={false}>
              {queue.map((item) => (
                <motion.li
                  key={item.key}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <StateIcon state={item.state} />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {item.message ? ` · ${item.message}` : ""}
                    </p>
                    {item.state === "uploading" && (
                      <div className="h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.state === "processing" && (
                      <div className="h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full w-1/3 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.state === "uploading" && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">{item.progress}%</span>
                    )}
                    {item.state === "duplicate" && (
                      <button
                        type="button"
                        onClick={() => forceUpload(item)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
                      >
                        Upload anyway
                      </button>
                    )}
                    {item.state === "error" && (
                      <button
                        type="button"
                        onClick={() => retry(item.key)}
                        title="Retry"
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.key)}
                      title="Remove from queue"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}

function StateIcon({ state }: { state: QueueState }) {
  const cls = "w-4 h-4 shrink-0";
  if (state === "uploading" || state === "processing")
    return <Loader2 className={`${cls} text-primary animate-spin`} />;
  if (state === "done") return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (state === "duplicate") return <Copy className={`${cls} text-amber-400`} />;
  if (state === "error") return <AlertTriangle className={`${cls} text-destructive`} />;
  return <FileImage className={`${cls} text-muted-foreground/40`} />;
}
