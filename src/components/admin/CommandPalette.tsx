import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, ShoppingBag, Tag, Layers,
  BookMarked, Store, Library, Grid3X3, Shield, FileText, Image as ImageIcon,
  BarChart3, ClipboardList, Settings, Video, MessageSquare, Crown, Sparkles,
  Globe, Plus, LogOut, ExternalLink, FileUp, User, BookOpen, Search,
} from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useWebsite } from "@/contexts/WebsiteContext";
import { supabase } from "@/lib/supabase";

/**
 * Universal Command Palette — Spotlight for the whole Command Center.
 *
 * Open with ⌘K / Ctrl+K anywhere in /admin, or the top-bar search button
 * (which dispatches the `admin:open-command` window event).
 *
 * Everything is 1 keystroke → 1 select away:
 *   • Go to — every admin section (a superset of the sidebar)
 *   • Create — jump straight to the section that makes new content
 *   • Records — live search across users, content, papers & books
 *   • Websites — switch the active site
 *   • Actions — view live site, sign out
 *
 * cmdk does the fuzzy filtering (built in). Each item carries rich `keywords`
 * so natural terms ("customers", "refund", "logout") resolve to the right place.
 */

type Group = "Go to" | "Create" | "Websites" | "Actions";
type Cmd = {
  id: string;
  group: Group;
  label: string;
  keywords: string[];
  icon: React.ElementType;
  shortcut?: string;
  perform: () => void;
};

type RecordHit = {
  id: string;
  label: string;
  sublabel: string;
  kind: "User" | "Content" | "Paper" | "Book";
  icon: React.ElementType;
  to: string;
};

const OPEN_EVENT = "admin:open-command";
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

// Sanitize free text before interpolating into a PostgREST ilike/or filter.
const safe = (q: string) => q.replace(/[,%()*]/g, " ").trim();

export default function CommandPalette() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { websites, current, switchWebsite } = useWebsite();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((to: string) => { setOpen(false); navigate(to); }, [navigate]);

  // ── Global open triggers ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) { setQuery(""); setRecords([]); setSearching(false); }
  }, [open]);

  // ── Static command registry ─────────────────────────────────────────────
  const commands = useMemo<Cmd[]>(() => {
    const nav = (id: string, label: string, icon: React.ElementType, to: string, kw: string[] = []): Cmd =>
      ({ id, group: "Go to", label, icon, keywords: kw, perform: () => go(to) });
    const make = (id: string, label: string, icon: React.ElementType, to: string, kw: string[] = []): Cmd =>
      ({ id, group: "Create", label, icon, keywords: ["new", "add", "create", ...kw], perform: () => go(to) });

    return [
      nav("dashboard", "Dashboard", LayoutDashboard, "/admin", ["home", "command center", "overview"]),
      nav("content-studio", "Content Studio", Layers, "/admin/content-studio", ["upload", "publish"]),
      nav("clarity-sessions", "Clarity Sessions", Video, "/admin/clarity-sessions", ["video", "audio"]),
      nav("research-papers", "Research Papers", BookMarked, "/admin/research-papers", ["pdf", "paper"]),
      nav("old-books", "Old Books", Store, "/admin/old-books", ["marketplace", "store"]),
      nav("library", "Premium Library", Library, "/admin/library", ["pdf", "premium"]),
      nav("frameworks", "Frameworks", Grid3X3, "/admin/frameworks"),
      nav("protocols", "Protocols", Shield, "/admin/protocols"),
      nav("templates", "Templates", FileText, "/admin/templates"),
      nav("media", "Media Library", ImageIcon, "/admin/media", ["asset", "image", "video", "file"]),
      nav("site-content", "Site Content", Sparkles, "/admin/site-content", ["homepage", "hero", "banner"]),
      nav("testimonials", "Testimonials", MessageSquare, "/admin/testimonials", ["review", "quote"]),
      nav("face-submissions", "Member Submissions", Crown, "/admin/face-submissions", ["member of the day", "face"]),
      nav("orders", "Orders", ShoppingBag, "/admin/orders", ["revenue", "purchase", "payment", "refund"]),
      nav("subscriptions", "Subscriptions", CreditCard, "/admin/subscriptions", ["billing", "premium", "plan"]),
      nav("coupons", "Coupons", Tag, "/admin/coupons", ["discount", "promo", "code"]),
      nav("users", "Users", Users, "/admin/users", ["customer", "member", "people", "accounts"]),
      nav("analytics", "Analytics", BarChart3, "/admin/analytics", ["stats", "charts", "metrics"]),
      nav("audit-logs", "Audit Logs", ClipboardList, "/admin/audit-logs", ["history", "security", "events"]),
      nav("coaching", "Coaching", MessageSquare, "/admin/coaching", ["booking", "sessions"]),
      nav("create-website", "Create Website", Globe, "/admin/create-website", ["add site", "new website"]),
      nav("settings", "Settings", Settings, "/admin/settings", ["config", "preferences"]),

      make("new-content", "New Content", Plus, "/admin/content-studio", ["upload", "publish"]),
      make("new-session", "New Clarity Session", Video, "/admin/clarity-sessions", ["video", "audio"]),
      make("new-paper", "New Research Paper", BookMarked, "/admin/research-papers", ["pdf"]),
      make("new-book", "New Old Book", BookOpen, "/admin/old-books", ["marketplace"]),
      make("new-media", "Upload Media", FileUp, "/admin/media", ["file", "image", "video"]),
      make("new-coupon", "New Coupon", Tag, "/admin/coupons", ["discount"]),
      make("new-testimonial", "New Testimonial", MessageSquare, "/admin/testimonials", ["review"]),

      { id: "view-site", group: "Actions", label: "View live site", icon: ExternalLink, keywords: ["open", "homepage"],
        perform: () => { setOpen(false); window.open("/", "_blank"); } },
      { id: "sign-out", group: "Actions", label: "Sign out", icon: LogOut, keywords: ["logout", "exit"],
        perform: () => { setOpen(false); signOut(); } },
    ];
  }, [go, signOut]);

  const websiteCommands = useMemo<Cmd[]>(() =>
    websites.map((site) => ({
      id: `site-${site.id}`,
      group: "Websites" as Group,
      label: `Switch to ${site.name}`,
      keywords: ["website", "site", site.name, site.slug ?? ""],
      icon: Globe,
      perform: () => { switchWebsite(site); setOpen(false); navigate("/admin"); },
    })), [websites, switchWebsite, navigate]);

  const groupsOrder: Group[] = ["Go to", "Create", "Websites", "Actions"];
  const allCmds = useMemo(() => [...commands, ...websiteCommands], [commands, websiteCommands]);

  // ── Live record search ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const raw = safe(query);
    if (raw.length < 2) { setRecords([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const like = `%${raw}%`;
      const wid = current?.id;
      const hits: RecordHit[] = [];
      try {
        const [users, content, papers, books] = await Promise.all([
          supabase.from("profiles").select("id,email,full_name")
            .or(`email.ilike.${like},full_name.ilike.${like}`).limit(5)
            .then((r) => r.data ?? [], () => []),
          (wid
            ? supabase.from("content_items").select("id,title,type").eq("website_id", wid).ilike("title", like).limit(6)
            : supabase.from("content_items").select("id,title,type").ilike("title", like).limit(6)
          ).then((r) => r.data ?? [], () => []),
          supabase.from("research_papers").select("id,title").ilike("title", like).limit(5)
            .then((r) => r.data ?? [], () => []),
          supabase.from("old_books").select("id,title,author").ilike("title", like).limit(5)
            .then((r) => r.data ?? [], () => []),
        ]);
        for (const u of users as any[])
          hits.push({ id: `u-${u.id}`, label: u.full_name || u.email || "User", sublabel: u.email || "user",
            kind: "User", icon: User, to: "/admin/users" });
        for (const c of content as any[])
          hits.push({ id: `c-${c.id}`, label: c.title || "Untitled", sublabel: c.type || "content",
            kind: "Content", icon: Layers, to: "/admin/content-studio" });
        for (const p of papers as any[])
          hits.push({ id: `p-${p.id}`, label: p.title || "Untitled", sublabel: "research paper",
            kind: "Paper", icon: BookMarked, to: "/admin/research-papers" });
        for (const b of books as any[])
          hits.push({ id: `b-${b.id}`, label: b.title || "Untitled", sublabel: b.author || "book",
            kind: "Book", icon: BookOpen, to: "/admin/old-books" });
      } catch { /* degrade silently — static commands still work */ }
      setRecords(hits);
      setSearching(false);
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, current?.id]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search sections, records, actions…"
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching…" : `No results for “${query}”.`}
        </CommandEmpty>

        {records.length > 0 && (
          <CommandGroup heading={searching ? "Records · searching…" : "Records"}>
            {records.map((r) => {
              const Icon = r.icon;
              return (
                // keywords include the raw query so server-filtered hits always survive cmdk's filter
                <CommandItem key={r.id} value={`${r.id} ${r.label} ${r.sublabel}`}
                  keywords={[query, r.label, r.sublabel]} onSelect={() => go(r.to)} className="gap-2.5">
                  <Icon className="w-4 h-4 opacity-70" />
                  <span className="truncate">{r.label}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[140px]">{r.sublabel}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px]">{r.kind}</span>
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {groupsOrder.map((groupName) => {
          const items = allCmds.filter((c) => c.group === groupName);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={groupName} heading={groupName}>
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <CommandItem key={c.id} value={`${c.id} ${c.label} ${c.keywords.join(" ")}`}
                    keywords={c.keywords} onSelect={c.perform} className="gap-2.5">
                    <Icon className="w-4 h-4 opacity-70" />
                    <span className="truncate">{c.label}</span>
                    {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>

      <div className="flex items-center gap-3 border-t border-white/8 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Search className="w-3 h-3" /> Universal search</span>
        <span className="ml-auto flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5">↑↓</kbd> navigate
          <kbd className="px-1.5 py-0.5 rounded bg-white/5">↵</kbd> open
          <kbd className="px-1.5 py-0.5 rounded bg-white/5">esc</kbd> close
        </span>
      </div>
    </CommandDialog>
  );
}
