import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert, Home, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const VaultUnavailable = () => {
  const [params] = useSearchParams();
  const reason = params.get("reason");

  const message =
    reason === "not-configured"
      ? "The Breakthrough Protocol Vault hasn't been connected yet. Update VAULT_URL in src/lib/vault-config.ts to point to your vault domain."
      : "The Breakthrough Protocol Vault is temporarily unavailable. Please try again in a few moments.";

  useEffect(() => {
    const ph = (window as any).posthog;
    ph?.capture?.("vault_unavailable_page_viewed", { reason: reason ?? "unknown" });
  }, [reason]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-card-elevated border border-border flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          </div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
            Breakthrough Protocol
          </p>
          <h1 className="font-display text-3xl font-light mb-4">Vault Unreachable</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="hero" size="sm">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to badly talks
              </Link>
            </Button>
            <Button asChild variant="glass" size="sm">
              <Link to="/contact">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VaultUnavailable;
