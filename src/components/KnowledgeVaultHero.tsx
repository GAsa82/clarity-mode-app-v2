import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, ChevronDown, FileText, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHeroContent, HERO_DEFAULTS, type HeroContent } from "@/lib/site-settings";

const PILLARS = [
  { icon: FileText, label: "Research Papers" },
  { icon: BookOpen, label: "Frameworks" },
  { icon: Layers, label: "Protocols" },
  { icon: Zap, label: "Templates" },
];

export const KnowledgeVaultHero = () => {
  const reduce = useReducedMotion();
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);

  useEffect(() => {
    getHeroContent("clarity-mode").then(setHero);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 md:min-h-[100svh] md:pt-32 md:pb-20 overflow-visible">
      {!reduce && (
        <motion.div
          className="absolute inset-0 z-30 bg-background pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      )}

      <div className="absolute inset-0 bg-hero pointer-events-none opacity-90" aria-hidden />

      <div className="container relative z-10">
        <div className="max-w-3xl">
          <motion.div
            className="flex flex-wrap items-center gap-2 mb-8"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs tracking-wide text-muted-foreground">
                {hero.badge}
              </span>
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-6"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {hero.titleLine1}<br />
            <span className="text-gradient italic">{hero.titleLine2}</span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-10"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-14"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button asChild variant="hero" size="xl" className="group">
              <Link to="/research">
                {hero.primaryCtaLabel}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <a href="/#library" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {hero.secondaryCtaLabel}
            </a>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.label}
                className="flex items-center gap-2.5 rounded-xl bg-card-elevated border border-border px-4 py-3"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
              >
                <p.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">{p.label}</span>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
      {/* Scroll indicator */}
      {!reduce && (
        <motion.a
          href="/#library"
          aria-label="Scroll down"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 group z-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground group-hover:text-foreground transition-colors">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card-elevated/60 group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.div>
        </motion.a>
      )}
    </section>
  );
};
