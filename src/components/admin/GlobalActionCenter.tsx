import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Layers, Video, BookMarked, BookOpen, FileUp, Tag, MessageSquare,
  Image as ImageIcon, ShoppingBag, Users, Search, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { openCommandPalette } from "@/components/admin/CommandPalette";

/**
 * Global Action Center — the one-click "Create" hub in the top bar.
 *
 * Complements the ⌘K palette (which is search-first): this is the always-visible,
 * point-and-click surface for the most common creates + operate destinations.
 * Opens with the button or the `c` key (guarded so it never fires while typing).
 */

type Action = { label: string; icon: React.ElementType; to: string };

const CREATE: Action[] = [
  { label: "New Content", icon: Layers, to: "/admin/content-studio?new=1" },
  { label: "New Clarity Session", icon: Video, to: "/admin/clarity-sessions" },
  { label: "New Research Paper", icon: BookMarked, to: "/admin/research-papers" },
  { label: "New Old Book", icon: BookOpen, to: "/admin/old-books" },
  { label: "Upload Media", icon: FileUp, to: "/admin/media" },
  { label: "New Coupon", icon: Tag, to: "/admin/coupons" },
  { label: "New Testimonial", icon: MessageSquare, to: "/admin/testimonials" },
];

const OPERATE: Action[] = [
  { label: "Content Studio", icon: Layers, to: "/admin/content-studio" },
  { label: "Media Library", icon: ImageIcon, to: "/admin/media" },
  { label: "Orders", icon: ShoppingBag, to: "/admin/orders" },
  { label: "Users", icon: Users, to: "/admin/users" },
];

export default function GlobalActionCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // `c` opens the action center — but never while the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" || el.isContentEditable
      );
      if (typing) return;
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const item = (a: Action) => {
    const Icon = a.icon;
    return (
      <DropdownMenuItem
        key={a.label}
        onSelect={() => navigate(a.to)}
        className="gap-2.5 cursor-pointer text-white/80 focus:text-white focus:bg-white/8"
      >
        <Icon className="w-4 h-4 opacity-70" />
        {a.label}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl text-xs font-medium transition-all
            bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25"
          title="Create (c)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 border-white/10 bg-[#0d0b1a]"
        style={{ backdropFilter: "blur(16px)" }}
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/30">Create</DropdownMenuLabel>
        {CREATE.map(item)}
        <DropdownMenuSeparator className="bg-white/8" />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-white/30">Operate</DropdownMenuLabel>
        {OPERATE.map(item)}
        <DropdownMenuSeparator className="bg-white/8" />
        <DropdownMenuItem
          onSelect={() => openCommandPalette()}
          className="gap-2.5 cursor-pointer text-white/60 focus:text-white focus:bg-white/8"
        >
          <Search className="w-4 h-4 opacity-70" />
          Search everything
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/50">⌘K</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
