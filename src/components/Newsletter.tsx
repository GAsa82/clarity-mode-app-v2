import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { addSubscriber } from "@/lib/subscribers";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = addSubscriber(email);
    if (!result.added) {
      if (result.reason === "invalid") setError("Please enter a valid email address.");
      else if (result.reason === "duplicate") setError("This email is already subscribed.");
      return;
    }
    setSent(true);
    const savedEmail = email;
    setEmail("");

    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: savedEmail }),
    }).catch(() => {/* non-critical — email already saved locally */});
  };

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="relative max-w-4xl mx-auto rounded-3xl bg-card-elevated border border-border p-10 md:p-16 text-center overflow-hidden noise">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(215_90%_30%/0.4),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              The Sunday Reset
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-light leading-tight mb-4">
              One email. <span className="text-silver italic">One reset.</span>
              <br /> Every Sunday.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-2">
              A calmer, sharper mind — one Sunday at a time. No noise. No spam.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 px-5 py-3.5 rounded-full bg-background/60 border border-border focus:border-primary outline-none text-sm transition-colors"
              />
              <Button variant="hero" size="lg" type="submit" className="group">
                {sent ? "Welcome in" : "Subscribe"}
                {!sent && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            {sent && <p className="mt-3 text-sm text-foreground">Thanks — you're subscribed.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
