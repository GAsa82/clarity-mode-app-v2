import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    desc: "Start clearing the noise.",
    features: [
      "Daily clarity quote",
      "5 articles / month",
      "Basic focus timer",
      "Mood tracker",
    ],
    cta: "Start free",
    variant: "glass" as const,
  },
  {
    name: "Premium",
    price: "12",
    period: "/month",
    desc: "The full clarity system.",
    features: [
      "Unlimited library access",
      "Audio sessions + ambient sounds",
      "Guided reset routines",
      "Premium journals & templates",
      "20% off all digital products",
      "Priority new releases",
    ],
    cta: "Go Premium",
    variant: "hero" as const,
    featured: true,
  },
  {
    name: "Annual",
    price: "89",
    period: "/year",
    desc: "Commit to the focused year.",
    features: [
      "Everything in Premium",
      "Save 38%",
      "Free Confidence Rebuild Blueprint",
      "Quarterly clarity workshops",
    ],
    cta: "Lock in annual",
    variant: "glass" as const,
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
            Membership
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight mb-4">
            Choose your <span className="text-silver italic">level of clarity.</span>
          </h2>
          <p className="text-muted-foreground">
            Cancel anytime. Designed for serious self-builders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl p-8 border transition-all duration-500 hover:-translate-y-1 ${
                t.featured
                  ? "bg-card-elevated border-primary/40 shadow-glow"
                  : "bg-card-elevated border-border"
              }`}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-primary-gradient text-primary-foreground">
                  Most chosen
                </div>
              )}
              <p className="font-display text-xl mb-1">{t.name}</p>
              <p className="text-sm text-muted-foreground mb-6">{t.desc}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-5xl font-light text-gradient">
                  ${t.price}
                </span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <Button asChild variant={t.variant} size="lg" className="w-full mb-8">
                <Link to={t.name === "Free" ? "/login" : "/pricing"}>
                  {t.cta}
                </Link>
              </Button>
              <ul className="space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
