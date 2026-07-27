import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Search, Inbox, LayoutGrid, Sparkles, FileText, Headphones, ClipboardList,
  Lightbulb, BookMarked, Newspaper, RefreshCw, Loader2, Trash2, Archive, CheckCircle2, X,
} from "lucide-react";
import {
  listPages, getDiaryStats, signDiaryPaths, setPageStatus, deletePages,
  type DiaryPage, type DiaryStats, type DiaryStatus,
} from "@/lib/diary";
import { DiaryUploader } from "@/components/admin/diary/DiaryUploader";
import { DiaryPageDetail } from "@/components/admin/diary/DiaryPageDetail";

type Tab = "overview" | "inbox" | "library";

const STATUS_STYLE: Record<DiaryStatus, string> = {
  pending: "bg-secondary text-muted-foreground",
  processing: "bg-blue-500/15 text-blue-400",
  needs_review: "bg-amber-500/15 text-amber-400",
  processed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  archived: "bg-slate-500/15 text-slate-400",
};

const STATUS_OPTIONS: (DiaryStatus | "all")[] = [
  "all", "pending", "processing", "needs_review", "processed", "failed", "archived",
];

export default function DiaryAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [pages, setPages] = useState<DiaryPage[]>([]);
  const [total, setTotal] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DiaryStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<DiaryPage | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        getDiaryStats(),
        listPages({ search, status: statusFilter }),
      ]);
      setStats(s);
      setPages(p.pages);
      setTotal(p.total);

      // Private bucket: thumbnails need signed URLs, batched in one request.
      const paths = p.pages.map((x) => x.thumbnail_path ?? x.image_path).filter(Boolean) as string[];
      setThumbs(await signDiaryPaths(paths));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the diary.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0); // debounce typing only
    return () => clearTimeout(t);
  }, [load, search]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const bulk = async (fn: () => Promise<void>) => {
    setBulkBusy(true);
    setError(null);
    try {
      await fn();
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedPages = useMemo(
    () => pages.filter((p) => selected.has(p.id)),
    [pages, selected]
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-light mb-1 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Diary
          </h1>
          <p className="text-muted-foreground text-sm">
            Your handwritten pages, turned into a searchable knowledge base. Private to admins.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs font-medium disabled:opacity-60 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-card border border-border w-fit">
        {([
          ["overview", "Overview", LayoutGrid],
          ["inbox", "Inbox", Inbox],
          ["library", "Library", Search],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 text-xs text-destructive px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
          {error}
        </p>
      )}

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Diary pages" value={stats?.totalPages ?? 0} icon={Brain} accent />
            <Stat label="Awaiting processing" value={stats?.pending ?? 0} icon={Inbox} />
            <Stat label="Processed" value={stats?.processed ?? 0} icon={CheckCircle2} />
            <Stat
              label="Knowledge base"
              value={stats ? formatChars(stats.knowledgeChars) : "0"}
              icon={Sparkles}
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Generated assets
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat label="PDFs" value={stats?.assetsByKind.pdf ?? 0} icon={FileText} small />
              <Stat label="Audio" value={stats?.assetsByKind.audio ?? 0} icon={Headphones} small />
              <Stat label="Templates" value={stats?.assetsByKind.template ?? 0} icon={ClipboardList} small />
              <Stat label="Insights" value={stats?.assetsByKind.insight ?? 0} icon={Lightbulb} small />
              <Stat label="Research" value={stats?.assetsByKind.research_paper ?? 0} icon={BookMarked} small />
              <Stat label="Articles" value={stats?.assetsByKind.article ?? 0} icon={Newspaper} small />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Needs review" value={stats?.needsReview ?? 0} icon={ClipboardList} small />
            <Stat label="Failed" value={stats?.failed ?? 0} icon={X} small />
            <Stat label="Drafts" value={stats?.drafts ?? 0} icon={FileText} small />
            <Stat label="Published" value={stats?.published ?? 0} icon={CheckCircle2} small />
          </div>

          {/* Recent */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Recent pages
            </p>
            {loading ? (
              <SkeletonGrid />
            ) : pages.length === 0 ? (
              <EmptyState onGo={() => setTab("inbox")} />
            ) : (
              <PageGrid
                pages={pages.slice(0, 12)}
                thumbs={thumbs}
                selected={selected}
                onToggle={toggle}
                onOpen={setDetail}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Inbox ── */}
      {tab === "inbox" && (
        <div className="space-y-6">
          <DiaryUploader onUploaded={load} />
          {stats && stats.pending > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.pending} page{stats.pending === 1 ? "" : "s"} waiting to be processed.
            </p>
          )}
        </div>
      )}

      {/* ── Library ── */}
      {tab === "library" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search summaries, topics, tags and page text…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DiaryStatus | "all")}
              className="px-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-xs font-medium">{selected.size} selected</span>
              <div className="flex flex-wrap gap-2 ml-auto">
                <button
                  onClick={() => bulk(() => setPageStatus([...selected], "processed"))}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-secondary/70 disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => bulk(() => setPageStatus([...selected], "archived"))}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs hover:bg-secondary/70 disabled:opacity-50 transition"
                >
                  <Archive className="w-3 h-3" /> Archive
                </button>
                <button
                  onClick={() => bulk(() => deletePages(selectedPages))}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 text-xs disabled:opacity-50 transition"
                >
                  {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${total} page${total === 1 ? "" : "s"}`}
            {search ? ` matching “${search}”` : ""}
          </p>

          {loading ? (
            <SkeletonGrid />
          ) : pages.length === 0 ? (
            search || statusFilter !== "all" ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
                <p className="text-sm text-muted-foreground">No pages match those filters.</p>
              </div>
            ) : (
              <EmptyState onGo={() => setTab("inbox")} />
            )
          ) : (
            <PageGrid
              pages={pages}
              thumbs={thumbs}
              selected={selected}
              onToggle={toggle}
              onOpen={setDetail}
            />
          )}
        </div>
      )}

      {detail && (
        <DiaryPageDetail
          page={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            load();
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  icon: Icon,
  accent = false,
  small = false,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card/60"
      }`}
    >
      <Icon className={`w-4 h-4 mb-2 ${accent ? "text-primary" : "text-muted-foreground/50"}`} />
      <p className={`font-display font-light ${small ? "text-xl" : "text-3xl"} leading-none`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function PageGrid({
  pages,
  thumbs,
  selected,
  onToggle,
  onOpen,
}: {
  pages: DiaryPage[];
  thumbs: Record<string, string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (p: DiaryPage) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {pages.map((page) => {
        const src = thumbs[page.thumbnail_path ?? page.image_path];
        const isSelected = selected.has(page.id);
        return (
          <motion.div
            key={page.id}
            layout
            className={`group relative rounded-2xl border overflow-hidden bg-card transition-colors ${
              isSelected ? "border-primary" : "border-border hover:border-primary/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onOpen(page)}
              className="block w-full text-left"
            >
              <div className="aspect-[3/4] bg-secondary/40 relative">
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium capitalize ${STATUS_STYLE[page.status]}`}
                >
                  {page.status.replace("_", " ")}
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-medium truncate">
                  {page.summary || page.original_filename || "Untitled page"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(page.entry_date ?? page.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>

            {/* Selection checkbox — kept outside the open-button so ticking
                a page for a bulk action never opens the detail view. */}
            <label
              className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                isSelected
                  ? "bg-primary border-primary"
                  : "bg-black/50 border-white/30 opacity-0 group-hover:opacity-100"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(page.id)}
                className="sr-only"
              />
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
            </label>
          </motion.div>
        );
      })}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-2xl bg-card border border-border animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <Brain className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-sm font-medium mb-1">No diary pages yet</p>
      <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
        Photograph or scan a page from your physical diary and upload it. Everything you add stays
        private and becomes searchable.
      </p>
      <button
        onClick={onGo}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition"
      >
        <Inbox className="w-3.5 h-3.5" /> Upload your first page
      </button>
    </div>
  );
}

/** Knowledge-base size reads better as prose than a raw character count. */
function formatChars(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return `${n} chars`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k chars`;
  return `${(n / 1_000_000).toFixed(2)}M chars`;
}
