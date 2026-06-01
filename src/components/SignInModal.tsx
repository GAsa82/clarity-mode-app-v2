import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clarity-user-email";

const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
const apiKey = (import.meta as any).env?.VITE_WHATSAPP_API_KEY || "";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

export const SignInModal = ({ open, onClose }: SignInModalProps) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, normalized);

    setLoading(true);

    // Notify server to send thank-you email
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;

      await fetch(`${apiBase}/api/signin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: normalized }),
      });
    } catch (err) {
      console.warn("Sign-in API request failed (email not sent)", err);
    }

    setLoading(false);
    setSent(true);
  };

  const handleClose = () => {
    setEmail("");
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl bg-card-elevated border border-border shadow-elegant overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-0">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-primary mb-1">
                    Welcome
                  </p>
                  <h2 className="font-display text-2xl font-light">
                    Sign in to <span className="text-silver italic">Clarity Mode</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {sent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                    <p className="font-display text-xl font-light text-gradient mb-2">
                      You're signed in.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      A welcome email is on its way to <strong className="text-foreground">{localStorage.getItem(STORAGE_KEY)}</strong>.
                    </p>
                    <Button variant="hero" size="sm" className="mt-6" onClick={handleClose}>
                      Start your session
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label htmlFor="signin-email" className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          id="signin-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          className="w-full pl-10 pr-4 py-3 rounded-full bg-background/60 border border-border focus:border-primary outline-none text-sm transition-colors"
                        />
                      </div>
                      {error && (
                        <p className="mt-2 text-xs text-destructive">{error}</p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sign in to save your progress, access the full clarity library, and get personalized recommendations.
                    </p>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="glass" size="lg" className="flex-1" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="hero" size="lg" className="flex-1 group" disabled={loading}>
                        {loading ? "Sending..." : "Sign in"}
                        {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export function getSignedInEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}