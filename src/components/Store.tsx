import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  title: string;
  desc: string;
  priceINR: number; // paise
  accent: string;
};

const products: Product[] = [
  {
    id: "30-days-mental-clarity",
    title: "30 Days to Mental Clarity",
    desc: "A guided 30-day system to silence overthinking and rebuild a focused mind.",
    priceINR: 249900, // ₹2499
    accent: "from-blue-500/20 to-blue-900/40",
  },
  {
    id: "overthinking-reset",
    title: "Overthinking Reset System",
    desc: "Worksheets, prompts, and protocols to break the mental loop. PDF + audio.",
    priceINR: 199900, // ₹1999
    accent: "from-slate-400/20 to-slate-800/40",
  },
  {
    id: "confidence-blueprint",
    title: "Confidence Rebuild Blueprint",
    desc: "A practical framework to restore self-trust through small kept promises.",
    priceINR: 289900, // ₹2899
    accent: "from-indigo-500/20 to-indigo-900/40",
  },
  {
    id: "focus-like-a-machine",
    title: "Focus Like a Machine",
    desc: "Deep work routines, dopamine protocols, and the Clarity timer system.",
    priceINR: 229900, // ₹2299
    accent: "from-cyan-500/15 to-blue-900/40",
  },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-sdk")) { resolve(true); return; }
    const s = document.createElement("script");
    s.id = "razorpay-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const Store = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (product: Product) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase." });
      return;
    }

    setLoading(product.id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay SDK failed to load");

      const token = (await import("@/lib/supabase").then((m) => m.supabase.auth.getSession()))
        .data.session?.access_token;

      const res = await fetch("/api/razorpay/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          item_type: "product",
          item_id: product.id,
          item_title: product.title,
          amount: product.priceINR,
        }),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const { orderId, amount, currency } = await res.json();

      const rzp = new (window as unknown as { Razorpay: new (opts: object) => { open(): void } }).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        order_id: orderId,
        name: "Clarity Mode",
        description: product.title,
        theme: { color: "#6366f1" },
        prefill: { email: user.email },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          await fetch("/api/razorpay/purchase-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(resp),
          });
          toast({ title: "Purchase complete!", description: `You now have access to ${product.title}.` });
        },
      });

      rzp.open();
    } catch (err) {
      console.error("[Store buy]", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="store" className="py-24 md:py-32 relative">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Premium Tools</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              Digital products that <span className="text-silver italic">change states.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Crafted systems, journals, and audio packs to install clarity into your daily life.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <article
              key={p.id}
              className="group flex flex-col bg-card-elevated border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`relative aspect-[4/5] bg-gradient-to-br ${p.accent} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(215_90%_62%/0.25),transparent_70%)]" />
                <div className="relative px-6 text-center">
                  <p className="font-display text-2xl leading-tight text-foreground/95">{p.title}</p>
                  <div className="mt-4 w-12 h-px bg-foreground/30 mx-auto" />
                  <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60">Clarity Mode</p>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{p.desc}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-2xl">₹{(p.priceINR / 100).toLocaleString("en-IN")}</span>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => handleBuy(p)}
                    disabled={loading === p.id}
                  >
                    {loading === p.id ? "Opening…" : "Buy now"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
