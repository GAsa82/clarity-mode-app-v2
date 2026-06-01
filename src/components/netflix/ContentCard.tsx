import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import type { ClaritySession } from "@/lib/clarity-content";

type ContentCardProps = {
  session: ClaritySession;
  onSelect: (session: ClaritySession) => void;
};

export const ContentCard = ({ session, onSelect }: ContentCardProps) => {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect(session)}
      className="group relative shrink-0 w-[168px] sm:w-[200px] md:w-[240px] text-left snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
      whileHover={{ scale: 1.08, zIndex: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-slate-950 shadow-card-soft ring-1 ring-white/5 transition-shadow duration-500 group-hover:shadow-glow group-hover:ring-primary/40">
        <div className={`absolute inset-0 bg-gradient-to-br ${session.accent}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(215_90%_62%/0.35),transparent_55%)]" />
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(180deg, transparent 40%, hsl(222 39% 5% / 0.95) 100%)",
          }}
        />

        {/* Animated shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.2s] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {session.premium && (
          <span className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/90 text-primary-foreground shadow-glow">
            <Sparkles className="w-2.5 h-2.5" />
            Premium
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <motion.div
            initial={{ scale: 0.6 }}
            whileHover={{ scale: 1 }}
            className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-elegant"
          >
            <Play className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" />
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <p className="text-[10px] uppercase tracking-widest text-primary/90 mb-1">
            {session.duration}
          </p>
          <p className="font-display text-sm leading-snug text-foreground line-clamp-2">
            {session.title}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors">
        {session.subtitle}
      </p>
    </motion.button>
  );
};
