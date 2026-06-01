import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClaritySession } from "@/lib/clarity-content";
import { ContentCard } from "./ContentCard";

type ContentRowProps = {
  title: string;
  sessions: ClaritySession[];
  onSelect: (session: ClaritySession) => void;
  index?: number;
  /** Inside TrendingRowWithRail — no outer section margin/padding */
  embedded?: boolean;
  hideTitle?: boolean;
};

export const ContentRow = ({
  title,
  sessions,
  onSelect,
  index = 0,
  embedded = false,
  hideTitle = false,
}: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (sessions.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <motion.div
      className={`relative group/row ${embedded ? "mb-0" : "mb-10 md:mb-14"}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
    >
      {!hideTitle && (
        <h3
          className={`font-display text-xl md:text-2xl font-light text-foreground mb-4 ${
            embedded ? "" : "px-6 md:px-12 lg:px-16"
          }`}
        >
          {title}
        </h3>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/70 border border-white/10 text-foreground opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary/20 hover:border-primary/40"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/70 border border-white/10 text-foreground opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary/20 hover:border-primary/40"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className={`flex gap-3 md:gap-4 overflow-x-auto overflow-y-visible pb-4 snap-x snap-mandatory scrollbar-none scroll-smooth ${
            embedded ? "pr-1" : "px-6 md:px-12 lg:px-16"
          }`}
        >
          {sessions.map((session) => (
            <ContentCard key={session.id} session={session} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
