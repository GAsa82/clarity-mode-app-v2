import { motion } from "framer-motion";
import { Bookmark, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClaritySession } from "@/lib/clarity-content";
import creatorImg from "@/assets/lora-silver-VJVsRSjYS4A-unsplash.jpg";

type FeaturedBannerProps = {
  session: ClaritySession;
  onWatch: (session: ClaritySession) => void;
  onMoreInfo: (session: ClaritySession) => void;
};

export const FeaturedBanner = ({ session, onWatch, onMoreInfo }: FeaturedBannerProps) => {
  return (
    <motion.div
      className="relative w-full min-h-[420px] md:min-h-[520px] mb-12 md:mb-16 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0">
        <img
          src={creatorImg}
          alt=""
          className="w-full h-full object-cover scale-105"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${session.accent}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222_39%_5%)] via-[hsl(222_39%_5%/0.4)] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222_39%_5%/0.95)] via-[hsl(222_39%_5%/0.6)] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,hsl(215_90%_62%/0.25),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col justify-end h-full min-h-[420px] md:min-h-[520px] px-6 md:px-12 lg:px-16 pb-12 md:pb-16 max-w-4xl">
        <motion.span
          className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full glass text-[10px] uppercase tracking-[0.2em] text-primary mb-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="w-3 h-3" />
          Featured Session
        </motion.span>

        <motion.h2
          className="font-display text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-gradient mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {session.title}
        </motion.h2>

        <motion.p
          className="text-base md:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {session.subtitle}
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="hero"
            size="lg"
            className="gap-2 group"
            onClick={() => onWatch(session)}
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
          <Button
            variant="glass"
            size="lg"
            className="gap-2"
            onClick={() => onMoreInfo(session)}
          >
            <Bookmark className="w-4 h-4" />
            More Info
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
