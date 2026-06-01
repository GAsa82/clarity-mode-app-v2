import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { addSubscriber, subscriberCount } from "@/lib/subscribers";

const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
const apiKey = (import.meta as any).env?.VITE_WHATSAPP_API_KEY || "";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCount(subscriberCount());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = addSubscriber(email);
    if (!result.added) {
      if (result.reason === "invalid") setError("Please enter a valid email address.");
      else if (result.reason === "duplicate") setError("This email is already subscribed.");
      return;
    }
    // optimistic local save
    setSent(true);
    setCount(subscriberCount());
    const savedEmail = email;
    setEmail("");

    // try to notify server (optional). Configure VITE_API_URL to point to your server.
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;
    fetch(`${apiBase}/api/subscribe`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: savedEmail }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn('Subscribe API responded with error', body);
      }
    }).catch((err) => {
      console.warn('Subscribe API request failed', err);
    });
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
              Join <strong>{count.toLocaleString()}</strong> readers building a calmer, sharper mind. No noise. No spam.
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
