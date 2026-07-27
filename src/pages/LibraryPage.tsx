import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Grid3X3, FileText, Library as LibraryIcon, BookOpen, Download,
  Lock, Search, Sparkles, ArrowRight, Clock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { getWebsiteIdBySlug } from "@/lib/site-settings";

/**
 * The public home for written and downloadable content — protocols,
 * frameworks, templates, guides and the premium library.
 *
 * The homepage "#library" section browses Clarity Sessions (video/audio);
 * this page is where everything else published through the CMS actually
 * becomes visible to visitors. Without it, content routed here by the diary
 * pipeline existed only in the admin panel.
 */

type Item = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  category: string;
  cover_url: string | null;
  file_url: string | null;
  preview_url: string | null;
  visibility: string;
  tags: string[];
  duration_sec: number | null;
  created_at: string;
};

/** Types this page surfaces. Sessions are deliberately excluded — they have
 *  their own Netflix-style browse on the homepage. */
const TYPES = ["protocol", "framework", "template", "pdf", "guide", "workbook", "download"] as const;

const TYPE_META: Record<string, { label: string; plural: string; icon: React.ElementType }> = {
  protocol: { label: "Protocol", plural: "Protocols", icon: Shield },
  framework: { label: "Framework", plural: "Frameworks", icon: Grid3X3 },
  template: { label: "Template", plural: "Templates", icon: FileText },
  pdf: { label: "Premium", plural: "Premium Library", icon: LibraryIcon },
  guide: { label: "Guide", plural: "Guides", icon: BookOpen },
  workbook: { label: "Workbook", plural: "Workbooks", icon: BookOpen },
  download: { label: "Download", plural: "Downloads", icon: Download },
};

export default function LibraryPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const websiteId = await getWebsiteIdBySlug("clarity-mode");
      let query = supabase
        .from("content_items")
        .select(
          "id, type, title, description, category, cover_url, file_url, preview_url, visibility, tags, duration_sec, created_at"
        )
        .in("type", TYPES as unknown as string[])
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (websiteId) query = query.eq("website_id", websiteId);

      const { data } = await query;
      setItems((data ?? []) as Item[]);
      setLoaded(true);
    })();
  }, []);

  const counts = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, i) => {
        acc[i.type] = (acc[i.type] ?? 0) + 1;
        return acc;
      }, {}),
    [items]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesType = filter === "all" || i.type === filter;
      const matchesSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [items, filter, search]);

  // Only offer type tabs that actually have content behind them.
  const availableTypes = TYPES.filter((t) => counts[t] > 0);

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">The Library</p>
            <h1 className="font-display text-4xl md:text-6xl font-light leading-[1.05] mb-5">
              Protocols, frameworks and{" "}
              <span className="text-silver italic">practical tools.</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Systems you can actually run — written to be used, not just read. Every piece here is
              built from real practice.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the library…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {availableTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  All · {items.length}
                </FilterChip>
                {availableTypes.map((t) => (
                  <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
                    {TYPE_META[t].plural} · {counts[t]}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>

          {!loaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState hasAny={items.length > 0} onClear={() => { setSearch(""); setFilter("all"); }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  unlocked={item.visibility === "public" || (!!user && isPremium)}
                  signedIn={!!user}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
      }`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  item,
  index,
  unlocked,
  signedIn,
}: {
  item: Item;
  index: number;
  unlocked: boolean;
  signedIn: boolean;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.download;
  const Icon = meta.icon;
  const premium = item.visibility === "premium";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="relative aspect-[16/9] bg-secondary/40 overflow-hidden">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-slate-950">
            <Icon className="w-8 h-8 text-primary/40" strokeWidth={1.5} />
          </div>
        )}

        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-[10px] uppercase tracking-wider text-white/90">
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>

        {premium && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/90 text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5" />
            Premium
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display text-lg font-light leading-snug mb-2 line-clamp-2">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
            {item.description}
          </p>
        )}

        <div className="mt-auto pt-2">
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {unlocked ? (
            item.file_url ? (
              <Button asChild variant="hero" size="sm" className="w-full gap-1.5">
                <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-3.5 h-3.5" />
                  Open
                </a>
              </Button>
            ) : (
              // Published but with nothing attached yet — say so rather than
              // offering a button that would do nothing.
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                Full version coming shortly
              </p>
            )
          ) : (
            <Button asChild variant="glass" size="sm" className="w-full gap-1.5">
              <Link to={signedIn ? "/pricing" : "/login?mode=signup&redirect=/library"}>
                <Lock className="w-3.5 h-3.5" />
                {signedIn ? "Unlock with Premium" : "Sign in to unlock"}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ hasAny, onClear }: { hasAny: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
      <LibraryIcon className="w-10 h-10 text-muted-foreground/25 mx-auto mb-4" strokeWidth={1.5} />
      {hasAny ? (
        <>
          <p className="text-sm font-medium mb-1">Nothing matches that</p>
          <p className="text-xs text-muted-foreground mb-5">Try a different search or filter.</p>
          <button
            onClick={onClear}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium mb-1">The library is being built</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
            New protocols, frameworks and templates are published here as they're written.
          </p>
          <Link
            to="/research"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Browse research papers instead
            <ArrowRight className="w-3 h-3" />
          </Link>
        </>
      )}
    </div>
  );
}
