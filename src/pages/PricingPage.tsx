import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Plan = "premium" | "annual";
type Gateway = "stripe" | "razorpay";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    priceUSD: "0",
    priceINR: "0",
    period: "forever",
    desc: "Start clearing the noise.",
    icon: Zap,
    features: [
      "Daily clarity quote",
      "Basic focus timer",
      "Mood tracker",
      "5 focus rooms",
    ],
    cta: "Current plan",
    featured: false,
  },
  {
    id: "premium" as const,
    name: "Premium",
    priceUSD: "12",
    priceINR: "999",
    period: "/month",
    desc: "The full clarity system.",
    icon: Sparkles,
    features: [
      "Everything in Free",
      "Full research paper library",
      "Downloadable frameworks & protocols",
      "All premium focus rooms",
      "Ambient sounds library",
      "Priority support",
    ],
    cta: "Go Premium",
    featured: true,
  },
  {
    id: "annual" as const,
    name: "Annual",
    priceUSD: "89",
    priceINR: "7399",
    period: "/year",
    desc: "Commit to the focused year.",
    icon: Crown,
    features: [
      "Everything in Premium",
      "Save 38% vs monthly",
      "Free Confidence Blueprint",
      "Quarterly clarity workshops",
      "Early access to new features",
    ],
    cta: "Lock in annual",
    featured: false,
  },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const { user, session } = useAuth();
  const { subscription, isPremium, isAdmin, plan: currentPlan, refetch } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStripe(plan: Plan) {
    if (!user) return navigate("/login?mode=signup&redirect=/pricing");
    setLoading(`stripe-${plan}`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Payments only work on the live site. Open clarity-mode-app-v2-gq26.vercel.app to checkout.");
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Checkout failed");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleRazorpay(plan: Plan) {
    if (!user) return navigate("/login?mode=signup&redirect=/pricing");
    setLoading(`razorpay-${plan}`);

    const loaded = await loadRazorpayScript();
    if (!loaded) { alert("Failed to load Razorpay. Check your connection."); setLoading(null); return; }

    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Payments only work on the live site. Open clarity-mode-app-v2-gq26.vercel.app to checkout.");
      }
      const order = await res.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key:         order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    order.currency,
        name:        "Clarity Mode",
        description: plan === "annual" ? "Annual Premium" : "Monthly Premium",
        order_id:    order.orderId,
        handler: async (response: any) => {
          const verify = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan,
            }),
          });
          const result = await verify.json();
          if (result.success) {
            await refetch();
            navigate("/payment/success");
          } else {
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: { email: user.email },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleManagePlan() {
    if (!user) return;
    if (subscription?.provider === "razorpay") {
      alert("To manage your Razorpay subscription, contact support at gauravsinghdata6@gmail.com");
      return;
    }
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Could not open billing portal. Contact support.");
    } catch {
      alert("Failed to open billing portal. Contact support.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-transparent relative z-0 overflow-x-hidden">
      <Navbar />
      <section className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Membership
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose your{" "}
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                clarity path
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Unlock AI Coach, premium focus rooms, and deep insights.
            </p>
          </div>

          {/* Admin banner */}
          {isAdmin && (
            <div className="flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Crown className="w-4 h-4" /> Admin account — all features unlocked
            </div>
          )}

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(p => {
              const Icon = p.icon;
              const isCurrentPlan = isAdmin
                ? p.id === "annual"
                : currentPlan === p.id && (p.id === "free" ? !isPremium : isPremium);
              const planLoading = loading?.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-8 flex flex-col gap-6 transition-all ${
                    p.featured
                      ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-card-elevated"
                  }`}
                >
                  {p.featured && !isAdmin && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Most Popular
                    </div>
                  )}
                  {isAdmin && p.id === "annual" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Admin Access
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-bold">${p.priceUSD}</span>
                      {p.priceINR !== "0" && (
                        <span className="text-muted-foreground text-sm mb-1">/ ₹{p.priceINR}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{p.period}</span>
                    <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isAdmin ? (
                    <Button variant="glass" className="w-full" disabled>
                      {p.id === "annual" ? "Active — Admin Access" : p.id === "free" ? "Included" : "Included"}
                    </Button>
                  ) : p.id === "free" ? (
                    <Button
                      variant="glass"
                      className="w-full"
                      disabled={!user || !isPremium}
                      onClick={() => navigate("/")}
                    >
                      {!user ? "Sign up free" : "Current plan"}
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button variant="glass" className="w-full" onClick={handleManagePlan}
                      disabled={loading === "portal"}>
                      {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage plan"}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        variant={p.featured ? "hero" : "glass"}
                        className="w-full"
                        onClick={() => handleStripe(p.id as Plan)}
                        disabled={!!loading}
                      >
                        {loading === `stripe-${p.id}`
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Pay with Card (USD)</>
                        }
                      </Button>
                      <Button
                        variant="glass"
                        className="w-full text-xs"
                        onClick={() => handleRazorpay(p.id as Plan)}
                        disabled={!!loading}
                      >
                        {loading === `razorpay-${p.id}`
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : `Pay ₹${p.priceINR} via UPI / Card (INR)`
                        }
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Secure payments via Stripe &amp; Razorpay · Cancel anytime · All prices exclude applicable taxes
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
