import { motion } from "framer-motion";
import { Shield } from "lucide-react";

interface VaultTransitionProps {
  isAdmin: boolean;
}

export const VaultTransition = ({ isAdmin }: VaultTransitionProps) => (
  <motion.div
    className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35, ease: "easeInOut" }}
  >
    {/* Ambient radial glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.12), transparent)",
      }}
    />

    {/* Icon */}
    <motion.div
      className="relative mb-8"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-pulse" />
      <div className="relative w-16 h-16 rounded-2xl bg-card-elevated border border-primary/30 flex items-center justify-center">
        <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
      </div>
    </motion.div>

    {/* Heading */}
    <motion.div
      className="text-center mb-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <p className="text-[10px] uppercase tracking-[0.35em] text-primary mb-3">
        Breakthrough Protocol
      </p>
      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
        Entering the Vault
      </h2>
      {isAdmin && (
        <p className="mt-2 text-xs text-muted-foreground">
          Admin access — full library unlocked
        </p>
      )}
    </motion.div>

    {/* Progress bar */}
    <div className="w-56 h-px bg-border rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{
          duration: isAdmin ? 0.85 : 1.65,
          ease: "linear",
          delay: 0.1,
        }}
      />
    </div>

    <motion.p
      className="mt-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {isAdmin ? "Authenticating admin session…" : "Preparing your access…"}
    </motion.p>
  </motion.div>
);
