import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, FileText, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVault } from "@/contexts/VaultContext";

const PILLARS = [
  { icon: FileText, label: "Research Papers" },
  { icon: BookOpen, label: "Frameworks" },
  { icon: Layers, label: "Protocols" },
  { icon: Zap, label: "Templates" },
];

export const KnowledgeVaultHero = () => {
  const reduce = useReducedMotion();
  const { openVault } = useVault();

  return (
    <section className="relative min-h-[100svh] flex items-center pt-28 pb-20 md:pt-32 overflow-hidden">
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
                Premium Knowledge Vault
              </span>
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-6"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            The library your<br />
            <span className="text-gradient italic">best mind needs.</span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-10"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Access premium research papers, frameworks, protocols, templates, and mental clarity resources designed to improve decision-making, focus, productivity, and personal growth.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-14"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              variant="hero"
              size="xl"
              className="group"
              onClick={() => openVault()}
            >
              Explore the Vault
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <a href="/#library" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Browse the library →
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
    </section>
  );
};
